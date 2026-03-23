// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GWCommissionEscrow
 * @notice Smart contract for escrowing commission payments on the Gründungswerft Benefits Platform
 * @dev USDC is locked until merchant confirms referral or release time passes
 *
 * Flow:
 * 1. Merchant funds escrow with USDC for affiliate
 * 2. After referral is confirmed OR release time passes, funds are released
 * 3. Platform takes a 1% fee on release
 * 4. Either party can raise a dispute for platform resolution
 */
contract GWCommissionEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice The USDC token contract
    IERC20 public immutable usdc;

    /// @notice Address that receives platform fees
    address public feeRecipient;

    /// @notice Platform fee in basis points (100 = 1%)
    uint256 public platformFeeBps = 100;

    /// @notice Minimum escrow amount in USDC (6 decimals)
    uint256 public minEscrowAmount = 10 * 1e6; // $10

    /// @notice Maximum release delay
    uint256 public maxReleaseDelay = 90 days;

    /// @notice Minimum release delay
    uint256 public minReleaseDelay = 1 days;

    /// @notice Escrow status enum
    enum EscrowStatus {
        Active,
        Released,
        Refunded,
        Disputed
    }

    /// @notice Escrow struct containing all escrow details
    struct Escrow {
        address merchant;       // Who funds the escrow
        address affiliate;      // Who receives on release
        uint256 amount;         // USDC amount (6 decimals)
        bytes32 referenceId;    // L4YERCAK3 commission ID
        uint256 releaseTime;    // When auto-release is allowed
        EscrowStatus status;    // Current status
        uint256 createdAt;      // Creation timestamp
    }

    /// @notice Mapping of escrow ID to Escrow struct
    mapping(uint256 => Escrow) public escrows;

    /// @notice Counter for next escrow ID
    uint256 public nextEscrowId;

    // ============ Events ============

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed merchant,
        address indexed affiliate,
        uint256 amount,
        bytes32 referenceId,
        uint256 releaseTime
    );

    event EscrowReleased(
        uint256 indexed escrowId,
        uint256 affiliateAmount,
        uint256 feeAmount
    );

    event EscrowRefunded(uint256 indexed escrowId);

    event EscrowDisputed(uint256 indexed escrowId, address disputedBy);

    event DisputeResolved(uint256 indexed escrowId, address winner);

    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    event MinEscrowAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // ============ Errors ============

    error InvalidAffiliate();
    error InvalidAmount();
    error InvalidReleaseDelay();
    error EscrowNotActive();
    error EscrowNotDisputed();
    error NotMerchant();
    error NotAffiliate();
    error NotParty();
    error TooEarly();
    error InvalidFee();
    error InvalidAddress();

    // ============ Constructor ============

    /**
     * @notice Creates a new GWCommissionEscrow contract
     * @param _usdc Address of the USDC token contract
     * @param _feeRecipient Address that receives platform fees
     */
    constructor(
        address _usdc,
        address _feeRecipient
    ) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_feeRecipient == address(0)) revert InvalidAddress();

        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ============ External Functions ============

    /**
     * @notice Create and fund a new escrow
     * @param affiliate Address that will receive funds on release
     * @param amount Amount of USDC to escrow
     * @param referenceId External reference ID (e.g., L4YERCAK3 commission ID)
     * @param releaseDelay Seconds until affiliate can auto-claim
     * @return escrowId The ID of the created escrow
     */
    function createEscrow(
        address affiliate,
        uint256 amount,
        bytes32 referenceId,
        uint256 releaseDelay
    ) external nonReentrant whenNotPaused returns (uint256 escrowId) {
        // Validations
        if (affiliate == address(0) || affiliate == msg.sender) {
            revert InvalidAffiliate();
        }
        if (amount < minEscrowAmount) {
            revert InvalidAmount();
        }
        if (releaseDelay < minReleaseDelay || releaseDelay > maxReleaseDelay) {
            revert InvalidReleaseDelay();
        }

        // Transfer USDC from merchant to contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Create escrow
        escrowId = nextEscrowId++;
        uint256 releaseTime = block.timestamp + releaseDelay;

        escrows[escrowId] = Escrow({
            merchant: msg.sender,
            affiliate: affiliate,
            amount: amount,
            referenceId: referenceId,
            releaseTime: releaseTime,
            status: EscrowStatus.Active,
            createdAt: block.timestamp
        });

        emit EscrowCreated(
            escrowId,
            msg.sender,
            affiliate,
            amount,
            referenceId,
            releaseTime
        );
    }

    /**
     * @notice Merchant releases escrow early (confirms referral was successful)
     * @param escrowId The ID of the escrow to release
     */
    function releaseByMerchant(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.merchant) revert NotMerchant();

        _release(escrowId);
    }

    /**
     * @notice Affiliate claims escrow after release time has passed
     * @param escrowId The ID of the escrow to claim
     */
    function claimByAffiliate(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.affiliate) revert NotAffiliate();
        if (block.timestamp < escrow.releaseTime) revert TooEarly();

        _release(escrowId);
    }

    /**
     * @notice Platform releases escrow (for verified commissions)
     * @param escrowId The ID of the escrow to release
     */
    function releaseByPlatform(uint256 escrowId) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();

        _release(escrowId);
    }

    /**
     * @notice Refund escrow to merchant (requires affiliate consent or dispute win)
     * @param escrowId The ID of the escrow to refund
     */
    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Active &&
            escrow.status != EscrowStatus.Disputed) {
            revert EscrowNotActive();
        }

        // Only platform owner or affiliate can trigger refund
        if (msg.sender != owner() && msg.sender != escrow.affiliate) {
            revert NotAffiliate();
        }

        escrow.status = EscrowStatus.Refunded;
        usdc.safeTransfer(escrow.merchant, escrow.amount);

        emit EscrowRefunded(escrowId);
    }

    /**
     * @notice Either party raises a dispute
     * @param escrowId The ID of the escrow to dispute
     */
    function raiseDispute(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.merchant && msg.sender != escrow.affiliate) {
            revert NotParty();
        }

        escrow.status = EscrowStatus.Disputed;

        emit EscrowDisputed(escrowId, msg.sender);
    }

    /**
     * @notice Platform resolves a dispute
     * @param escrowId The ID of the disputed escrow
     * @param releaseToAffiliate True to release to affiliate, false to refund merchant
     */
    function resolveDispute(
        uint256 escrowId,
        bool releaseToAffiliate
    ) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status != EscrowStatus.Disputed) revert EscrowNotDisputed();

        if (releaseToAffiliate) {
            _release(escrowId);
            emit DisputeResolved(escrowId, escrow.affiliate);
        } else {
            escrow.status = EscrowStatus.Refunded;
            usdc.safeTransfer(escrow.merchant, escrow.amount);
            emit DisputeResolved(escrowId, escrow.merchant);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Update the platform fee
     * @param _feeBps New fee in basis points (max 500 = 5%)
     */
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 500) revert InvalidFee();

        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;

        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    /**
     * @notice Update the fee recipient address
     * @param _recipient New fee recipient address
     */
    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();

        address oldRecipient = feeRecipient;
        feeRecipient = _recipient;

        emit FeeRecipientUpdated(oldRecipient, _recipient);
    }

    /**
     * @notice Update the minimum escrow amount
     * @param _amount New minimum amount in USDC
     */
    function setMinEscrowAmount(uint256 _amount) external onlyOwner {
        uint256 oldAmount = minEscrowAmount;
        minEscrowAmount = _amount;

        emit MinEscrowAmountUpdated(oldAmount, _amount);
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Get escrow details
     * @param escrowId The ID of the escrow
     * @return The Escrow struct
     */
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    /**
     * @notice Check if an escrow can be claimed by affiliate
     * @param escrowId The ID of the escrow
     * @return True if claimable
     */
    function isReleasable(uint256 escrowId) external view returns (bool) {
        Escrow storage escrow = escrows[escrowId];
        return escrow.status == EscrowStatus.Active &&
               block.timestamp >= escrow.releaseTime;
    }

    /**
     * @notice Get the contract's USDC balance
     * @return The balance in USDC
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Calculate platform fee for an amount
     * @param amount The amount to calculate fee for
     * @return The fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeBps) / 10000;
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to release escrow funds
     * @param escrowId The ID of the escrow to release
     */
    function _release(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];

        escrow.status = EscrowStatus.Released;

        // Calculate fee
        uint256 feeAmount = (escrow.amount * platformFeeBps) / 10000;
        uint256 affiliateAmount = escrow.amount - feeAmount;

        // Transfer fee to platform
        if (feeAmount > 0) {
            usdc.safeTransfer(feeRecipient, feeAmount);
        }

        // Transfer remainder to affiliate
        usdc.safeTransfer(escrow.affiliate, affiliateAmount);

        emit EscrowReleased(escrowId, affiliateAmount, feeAmount);
    }
}
