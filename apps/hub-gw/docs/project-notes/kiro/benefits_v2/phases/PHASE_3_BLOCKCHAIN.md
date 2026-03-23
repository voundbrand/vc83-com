# Phase 3: Blockchain Integration

**Phase:** 3 of 5
**Duration:** 3 weeks
**Status:** Not Started
**Dependencies:** Phase 2 complete

---

## Objectives

1. Implement MetaMask wallet linking
2. Create Ethereum payment provider for direct USDC transfers
3. Deploy commission escrow smart contract
4. Build blockchain event synchronization
5. Implement escrow payout workflow

---

## Deliverables

- [ ] Wallet linking with message signature verification
- [ ] Direct USDC payment flow via MetaMask
- [ ] Commission escrow smart contract (audited)
- [ ] Escrow funding and release workflows
- [ ] Blockchain event sync to L4YERCAK3
- [ ] Platform fee collection in smart contract

---

## Week 1: Wallet Integration

### Day 1-2: Privy Setup

**Task 3.1: Install and Configure Privy**

```bash
npm install @privy-io/react-auth @privy-io/wagmi-connector viem wagmi @tanstack/react-query
```

```typescript
// src/lib/wagmi.ts
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});
```

```typescript
// src/app/providers.tsx
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#6366f1",
          logo: "https://provision.gruendungswerft.com/logo.png",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        loginMethods: ["wallet"],
        supportedChains: [base, baseSepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
```

### Day 3-4: Wallet Linking

**Task 3.2: Link Wallet to Member Account**

```typescript
// src/components/wallet/link-wallet.tsx
"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSignMessage } from "wagmi";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LinkWallet({ memberId }: { memberId: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { signMessageAsync } = useSignMessage();
  const linkWallet = useMutation(api.gw.wallets.linkWallet);

  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkWallet = async () => {
    if (!authenticated) {
      login();
      return;
    }

    const wallet = wallets[0];
    if (!wallet) {
      setError("Keine Wallet gefunden");
      return;
    }

    setLinking(true);
    setError(null);

    try {
      const address = wallet.address;
      const message = `Ich verknüpfe meine Wallet ${address} mit meinem Gründungswerft Konto.\n\nTimestamp: ${Date.now()}`;

      const signature = await signMessageAsync({ message });

      await linkWallet({
        memberId,
        walletAddress: address,
        message,
        signature,
      });

      // Success!
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Verknüpfen");
    } finally {
      setLinking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet verknüpfen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Verknüpfe deine Wallet um Provisionen in USDC zu erhalten.
        </p>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button onClick={handleLinkWallet} disabled={linking} className="w-full">
          {!ready
            ? "Laden..."
            : !authenticated
            ? "Wallet verbinden"
            : linking
            ? "Verknüpfe..."
            : "Wallet verknüpfen"}
        </Button>

        {authenticated && wallets[0] && (
          <p className="text-xs text-gray-500 text-center">
            Verbunden: {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

**Task 3.3: Backend Wallet Verification**

```typescript
// convex/gw/wallets.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { verifyMessage } from "viem";

export const linkWallet = mutation({
  args: {
    memberId: v.id("objects"),
    walletAddress: v.string(),
    message: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify signature
    const isValid = await verifyMessage({
      address: args.walletAddress as `0x${string}`,
      message: args.message,
      signature: args.signature as `0x${string}`,
    });

    if (!isValid) {
      throw new Error("Ungültige Signatur");
    }

    // Check wallet not already linked to another member
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Mitglied nicht gefunden");

    const existingLink = await ctx.db
      .query("gwMemberWallets")
      .withIndex("by_wallet", q => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existingLink && existingLink.memberId !== member.customProperties?.gwUserId) {
      throw new Error("Wallet bereits mit anderem Konto verknüpft");
    }

    // Create or update link
    if (existingLink) {
      await ctx.db.patch(existingLink._id, {
        signature: args.signature,
        linkedAt: Date.now(),
      });
      return existingLink._id;
    }

    const linkId = await ctx.db.insert("gwMemberWallets", {
      organizationId: member.organizationId,
      memberId: member.customProperties?.gwUserId,
      walletAddress: args.walletAddress,
      signature: args.signature,
      linkedAt: Date.now(),
    });

    // Update member with linked wallet
    await ctx.db.patch(args.memberId, {
      customProperties: {
        ...member.customProperties,
        linkedWallets: [
          ...(member.customProperties?.linkedWallets || []),
          args.walletAddress,
        ],
      },
      updatedAt: Date.now(),
    });

    return linkId;
  },
});

export const getLinkedWallets = query({
  args: { memberId: v.id("objects") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) return [];

    return await ctx.db
      .query("gwMemberWallets")
      .withIndex("by_member", q =>
        q.eq("organizationId", member.organizationId)
          .eq("memberId", member.customProperties?.gwUserId)
      )
      .collect();
  },
});
```

### Day 5: Direct USDC Payment

**Task 3.4: Ethereum Payment Provider**

```typescript
// convex/paymentProviders/ethereum.ts
import { IPaymentProvider } from "./types";

export class EthereumPaymentProvider implements IPaymentProvider {
  readonly providerCode = "ethereum";
  readonly providerName = "Crypto (USDC)";
  readonly providerIcon = "🦊";

  private chainId: number;
  private usdcAddress: `0x${string}`;

  constructor() {
    const isTestnet = process.env.ETHEREUM_TESTNET === "true";
    this.chainId = isTestnet ? 84532 : 8453; // Base Sepolia or Base Mainnet
    this.usdcAddress = isTestnet
      ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      : "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    // Calculate amounts
    const grossAmount = BigInt(params.priceInCents) * BigInt(10000); // cents to 6 decimals
    const platformFee = this.calculatePlatformFee(params.priceInCents);
    const platformFeeUsdc = BigInt(platformFee) * BigInt(10000);
    const affiliateAmount = grossAmount - platformFeeUsdc;

    // Create payment request for frontend
    const paymentRequest = {
      type: "direct_transfer",
      chainId: this.chainId,
      token: this.usdcAddress,
      transfers: [
        {
          to: params.connectedAccountId, // Affiliate wallet
          amount: affiliateAmount.toString(),
          label: "Commission to affiliate",
        },
        {
          to: process.env.PLATFORM_FEE_WALLET, // Platform wallet
          amount: platformFeeUsdc.toString(),
          label: "Platform fee",
        },
      ],
      reference: params.metadata?.commissionId || crypto.randomUUID(),
      expiresAt: Date.now() + 3600000,
      metadata: {
        commissionId: params.metadata?.commissionId,
        affiliateId: params.metadata?.affiliateId,
        merchantId: params.metadata?.merchantId,
      },
    };

    return {
      sessionId: paymentRequest.reference,
      providerSessionId: paymentRequest.reference,
      clientSecret: Buffer.from(JSON.stringify(paymentRequest)).toString("base64"),
      expiresAt: paymentRequest.expiresAt,
      metadata: {
        chainId: this.chainId,
        grossAmount: grossAmount.toString(),
        platformFee: platformFeeUsdc.toString(),
        affiliateAmount: affiliateAmount.toString(),
      },
    };
  }

  async verifyCheckoutPayment(
    sessionId: string,
    txHash?: string
  ): Promise<PaymentVerificationResult> {
    if (!txHash) {
      return { verified: false, status: "pending" };
    }

    // Verify transaction on-chain
    const response = await fetch(
      `${process.env.BASE_RPC_URL}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      }
    );

    const { result: receipt } = await response.json();

    if (!receipt) {
      return { verified: false, status: "pending" };
    }

    if (receipt.status === "0x1") {
      return {
        verified: true,
        paymentIntentId: txHash,
        status: "succeeded",
        metadata: {
          blockNumber: parseInt(receipt.blockNumber, 16),
          gasUsed: parseInt(receipt.gasUsed, 16),
        },
      };
    }

    return { verified: false, status: "failed" };
  }

  private calculatePlatformFee(amountInCents: number): number {
    const feePercent = 0.015; // 1.5%
    const minFee = 50;        // €0.50
    const maxFee = 2500;      // €25.00

    const calculatedFee = Math.round(amountInCents * feePercent);
    return Math.max(minFee, Math.min(maxFee, calculatedFee));
  }
}
```

---

## Week 2: Smart Contract

### Day 6-8: Escrow Contract Development

**Task 3.5: Commission Escrow Contract**

```solidity
// contracts/GWCommissionEscrow.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract GWCommissionEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // State
    IERC20 public immutable usdc;
    address public feeRecipient;
    uint256 public platformFeeBps = 100; // 1%
    uint256 public minEscrowAmount = 10 * 1e6; // $10 USDC
    uint256 public maxReleaseDelay = 90 days;
    uint256 public minReleaseDelay = 1 days;

    enum EscrowStatus { Active, Released, Refunded, Disputed }

    struct Escrow {
        address merchant;
        address affiliate;
        uint256 amount;
        bytes32 referenceId;
        uint256 releaseTime;
        EscrowStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;

    // Events
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
    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    // Errors
    error InvalidAffiliate();
    error InvalidAmount();
    error InvalidReleaseDelay();
    error EscrowNotActive();
    error NotMerchant();
    error NotAffiliate();
    error NotParty();
    error TooEarly();
    error AlreadyClaimed();

    constructor(
        address _usdc,
        address _feeRecipient
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    /// @notice Create and fund a new escrow
    function createEscrow(
        address affiliate,
        uint256 amount,
        bytes32 referenceId,
        uint256 releaseDelay
    ) external nonReentrant whenNotPaused returns (uint256 escrowId) {
        if (affiliate == address(0) || affiliate == msg.sender) {
            revert InvalidAffiliate();
        }
        if (amount < minEscrowAmount) {
            revert InvalidAmount();
        }
        if (releaseDelay < minReleaseDelay || releaseDelay > maxReleaseDelay) {
            revert InvalidReleaseDelay();
        }

        // Transfer USDC from merchant
        usdc.safeTransferFrom(msg.sender, address(this), amount);

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

    /// @notice Merchant releases escrow early (confirms referral)
    function releaseByMerchant(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.merchant) revert NotMerchant();

        _release(escrowId);
    }

    /// @notice Affiliate claims after release time
    function claimByAffiliate(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.affiliate) revert NotAffiliate();
        if (block.timestamp < escrow.releaseTime) revert TooEarly();

        _release(escrowId);
    }

    /// @notice Platform releases (for verified commissions)
    function releaseByPlatform(uint256 escrowId) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();

        _release(escrowId);
    }

    function _release(uint256 escrowId) internal {
        Escrow storage escrow = escrows[escrowId];
        escrow.status = EscrowStatus.Released;

        uint256 feeAmount = (escrow.amount * platformFeeBps) / 10000;
        uint256 affiliateAmount = escrow.amount - feeAmount;

        if (feeAmount > 0) {
            usdc.safeTransfer(feeRecipient, feeAmount);
        }
        usdc.safeTransfer(escrow.affiliate, affiliateAmount);

        emit EscrowReleased(escrowId, affiliateAmount, feeAmount);
    }

    /// @notice Refund to merchant (requires affiliate consent or dispute win)
    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Active &&
            escrow.status != EscrowStatus.Disputed) {
            revert EscrowNotActive();
        }

        // Only platform or affiliate can trigger refund
        if (msg.sender != owner() && msg.sender != escrow.affiliate) {
            revert NotAffiliate();
        }

        escrow.status = EscrowStatus.Refunded;
        usdc.safeTransfer(escrow.merchant, escrow.amount);

        emit EscrowRefunded(escrowId);
    }

    /// @notice Either party raises a dispute
    function raiseDispute(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Active) revert EscrowNotActive();
        if (msg.sender != escrow.merchant && msg.sender != escrow.affiliate) {
            revert NotParty();
        }

        escrow.status = EscrowStatus.Disputed;
        emit EscrowDisputed(escrowId, msg.sender);
    }

    /// @notice Platform resolves dispute
    function resolveDispute(
        uint256 escrowId,
        bool releaseToAffiliate
    ) external onlyOwner nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Disputed) revert EscrowNotActive();

        if (releaseToAffiliate) {
            _release(escrowId);
            emit DisputeResolved(escrowId, escrow.affiliate);
        } else {
            escrow.status = EscrowStatus.Refunded;
            usdc.safeTransfer(escrow.merchant, escrow.amount);
            emit DisputeResolved(escrowId, escrow.merchant);
        }
    }

    // Admin functions
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(_feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(_recipient);
    }

    function setMinEscrowAmount(uint256 _amount) external onlyOwner {
        minEscrowAmount = _amount;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // View functions
    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function isReleasable(uint256 escrowId) external view returns (bool) {
        Escrow storage escrow = escrows[escrowId];
        return escrow.status == EscrowStatus.Active &&
               block.timestamp >= escrow.releaseTime;
    }

    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
```

### Day 9-10: Contract Deployment

**Task 3.6: Foundry Setup and Tests**

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Create contracts directory
mkdir -p contracts
cd contracts
forge init
```

```solidity
// contracts/test/GWCommissionEscrow.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GWCommissionEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        _mint(msg.sender, 1000000 * 1e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract GWCommissionEscrowTest is Test {
    GWCommissionEscrow public escrow;
    MockUSDC public usdc;

    address public owner = address(1);
    address public merchant = address(2);
    address public affiliate = address(3);
    address public feeRecipient = address(4);

    function setUp() public {
        vm.startPrank(owner);
        usdc = new MockUSDC();
        escrow = new GWCommissionEscrow(address(usdc), feeRecipient);

        // Fund merchant
        usdc.mint(merchant, 10000 * 1e6);
        vm.stopPrank();
    }

    function testCreateEscrow() public {
        uint256 amount = 500 * 1e6; // $500
        bytes32 refId = keccak256("commission-1");

        vm.startPrank(merchant);
        usdc.approve(address(escrow), amount);
        uint256 escrowId = escrow.createEscrow(affiliate, amount, refId, 7 days);
        vm.stopPrank();

        GWCommissionEscrow.Escrow memory e = escrow.getEscrow(escrowId);
        assertEq(e.merchant, merchant);
        assertEq(e.affiliate, affiliate);
        assertEq(e.amount, amount);
        assertEq(uint(e.status), uint(GWCommissionEscrow.EscrowStatus.Active));
    }

    function testReleaseByMerchant() public {
        uint256 amount = 500 * 1e6;
        bytes32 refId = keccak256("commission-1");

        vm.startPrank(merchant);
        usdc.approve(address(escrow), amount);
        uint256 escrowId = escrow.createEscrow(affiliate, amount, refId, 7 days);
        escrow.releaseByMerchant(escrowId);
        vm.stopPrank();

        // Check balances
        uint256 expectedFee = (amount * 100) / 10000; // 1%
        uint256 expectedAffiliate = amount - expectedFee;

        assertEq(usdc.balanceOf(affiliate), expectedAffiliate);
        assertEq(usdc.balanceOf(feeRecipient), expectedFee);
    }

    function testClaimAfterDelay() public {
        uint256 amount = 500 * 1e6;
        bytes32 refId = keccak256("commission-1");

        vm.startPrank(merchant);
        usdc.approve(address(escrow), amount);
        uint256 escrowId = escrow.createEscrow(affiliate, amount, refId, 7 days);
        vm.stopPrank();

        // Fast forward 7 days
        vm.warp(block.timestamp + 7 days + 1);

        vm.prank(affiliate);
        escrow.claimByAffiliate(escrowId);

        uint256 expectedFee = (amount * 100) / 10000;
        uint256 expectedAffiliate = amount - expectedFee;
        assertEq(usdc.balanceOf(affiliate), expectedAffiliate);
    }

    function testCannotClaimEarly() public {
        uint256 amount = 500 * 1e6;
        bytes32 refId = keccak256("commission-1");

        vm.startPrank(merchant);
        usdc.approve(address(escrow), amount);
        uint256 escrowId = escrow.createEscrow(affiliate, amount, refId, 7 days);
        vm.stopPrank();

        vm.prank(affiliate);
        vm.expectRevert(GWCommissionEscrow.TooEarly.selector);
        escrow.claimByAffiliate(escrowId);
    }
}
```

**Task 3.7: Deploy to Testnet**

```typescript
// contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GWCommissionEscrow.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        GWCommissionEscrow escrow = new GWCommissionEscrow(usdc, feeRecipient);

        console.log("Escrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}
```

```bash
# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

---

## Week 3: Integration & Sync

### Day 11-13: Blockchain Event Sync

**Task 3.8: Escrow Provider**

```typescript
// convex/paymentProviders/ethereumEscrow.ts
import { IPaymentProvider } from "./types";
import { encodeFunctionData, parseAbi } from "viem";

const ESCROW_ABI = parseAbi([
  "function createEscrow(address affiliate, uint256 amount, bytes32 referenceId, uint256 releaseDelay) returns (uint256)",
  "function releaseByPlatform(uint256 escrowId)",
  "event EscrowCreated(uint256 indexed escrowId, address indexed merchant, address indexed affiliate, uint256 amount, bytes32 referenceId, uint256 releaseTime)",
  "event EscrowReleased(uint256 indexed escrowId, uint256 affiliateAmount, uint256 feeAmount)",
]);

export class EthereumEscrowProvider implements IPaymentProvider {
  readonly providerCode = "ethereum-escrow";
  readonly providerName = "Smart Contract Escrow";
  readonly providerIcon = "🔐";

  private escrowAddress: `0x${string}`;
  private usdcAddress: `0x${string}`;
  private chainId: number;

  constructor() {
    this.escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`;
    this.usdcAddress = process.env.USDC_ADDRESS as `0x${string}`;
    this.chainId = parseInt(process.env.CHAIN_ID || "8453");
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const amount = BigInt(params.priceInCents) * BigInt(10000);
    const referenceId = `0x${Buffer.from(params.metadata?.commissionId || "")
      .toString("hex")
      .padEnd(64, "0")}`;
    const releaseDelay = 7 * 24 * 60 * 60; // 7 days

    // Build approval tx data
    const approvalData = encodeFunctionData({
      abi: parseAbi(["function approve(address spender, uint256 amount)"]),
      functionName: "approve",
      args: [this.escrowAddress, amount],
    });

    // Build escrow creation tx data
    const escrowData = encodeFunctionData({
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [
        params.connectedAccountId as `0x${string}`, // affiliate
        amount,
        referenceId as `0x${string}`,
        BigInt(releaseDelay),
      ],
    });

    const paymentRequest = {
      type: "escrow",
      chainId: this.chainId,
      transactions: [
        {
          to: this.usdcAddress,
          data: approvalData,
          description: "Approve USDC for escrow",
        },
        {
          to: this.escrowAddress,
          data: escrowData,
          description: "Fund escrow",
        },
      ],
      reference: params.metadata?.commissionId,
      releaseDelay,
      expiresAt: Date.now() + 86400000, // 24 hours
    };

    return {
      sessionId: paymentRequest.reference as string,
      providerSessionId: paymentRequest.reference as string,
      clientSecret: Buffer.from(JSON.stringify(paymentRequest)).toString("base64"),
      expiresAt: paymentRequest.expiresAt,
      metadata: {
        escrowAddress: this.escrowAddress,
        releaseDelay,
      },
    };
  }

  async verifyCheckoutPayment(
    sessionId: string,
    txHash?: string
  ): Promise<PaymentVerificationResult> {
    // Similar to ethereum provider, verify escrow creation tx
    // Parse logs for EscrowCreated event
    // Extract escrowId

    return {
      verified: true,
      paymentIntentId: txHash!,
      status: "succeeded",
      metadata: {
        // escrowId from event logs
      },
    };
  }
}
```

**Task 3.9: Event Synchronization**

```typescript
// convex/blockchain/sync.ts
import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

export const syncEscrowEvents = internalAction({
  handler: async (ctx) => {
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL),
    });

    // Get last synced block
    const syncState = await ctx.runQuery(internal.blockchain.getSyncState, {
      contractType: "escrow",
    });
    const fromBlock = BigInt(syncState?.lastBlock || 0) + 1n;

    // Fetch EscrowCreated events
    const createdEvents = await client.getLogs({
      address: process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: parseAbiItem(
        "event EscrowCreated(uint256 indexed escrowId, address indexed merchant, address indexed affiliate, uint256 amount, bytes32 referenceId, uint256 releaseTime)"
      ),
      fromBlock,
    });

    for (const event of createdEvents) {
      await ctx.runMutation(internal.blockchain.recordEscrowCreated, {
        escrowId: event.args.escrowId!.toString(),
        merchant: event.args.merchant!,
        affiliate: event.args.affiliate!,
        amount: event.args.amount!.toString(),
        referenceId: event.args.referenceId!,
        releaseTime: Number(event.args.releaseTime!),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
      });
    }

    // Fetch EscrowReleased events
    const releasedEvents = await client.getLogs({
      address: process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`,
      event: parseAbiItem(
        "event EscrowReleased(uint256 indexed escrowId, uint256 affiliateAmount, uint256 feeAmount)"
      ),
      fromBlock,
    });

    for (const event of releasedEvents) {
      await ctx.runMutation(internal.blockchain.recordEscrowReleased, {
        escrowId: event.args.escrowId!.toString(),
        affiliateAmount: event.args.affiliateAmount!.toString(),
        feeAmount: event.args.feeAmount!.toString(),
        txHash: event.transactionHash,
        blockNumber: Number(event.blockNumber),
      });
    }

    // Update sync state
    const latestBlock = await client.getBlockNumber();
    await ctx.runMutation(internal.blockchain.updateSyncState, {
      contractType: "escrow",
      lastBlock: Number(latestBlock),
    });
  },
});

export const recordEscrowCreated = internalMutation({
  args: {
    escrowId: v.string(),
    merchant: v.string(),
    affiliate: v.string(),
    amount: v.string(),
    referenceId: v.string(),
    releaseTime: v.number(),
    txHash: v.string(),
    blockNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the commission payout by reference
    // Update status to "funded"
    // Record platform fee (will be collected on release)

    console.log(`Escrow ${args.escrowId} created, funded with ${args.amount}`);
  },
});

// Cron to sync every minute
// convex/crons.ts
crons.interval(
  "sync escrow events",
  { minutes: 1 },
  internal.blockchain.sync.syncEscrowEvents
);
```

### Day 14-15: Escrow UI

**Task 3.10: Escrow Payment Flow**

```typescript
// src/components/payments/escrow-payment.tsx
"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, encodeFunctionData } from "viem";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const USDC_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ESCROW_ABI = [
  {
    name: "createEscrow",
    type: "function",
    inputs: [
      { name: "affiliate", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "referenceId", type: "bytes32" },
      { name: "releaseDelay", type: "uint256" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
] as const;

interface EscrowPaymentProps {
  commissionId: string;
  affiliateWallet: string;
  amount: number; // in cents
  onSuccess: (txHash: string) => void;
}

export function EscrowPayment({
  commissionId,
  affiliateWallet,
  amount,
  onSuccess,
}: EscrowPaymentProps) {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<"approve" | "fund" | "done">("approve");

  const usdcAmount = parseUnits((amount / 100).toString(), 6);
  const referenceId = `0x${Buffer.from(commissionId).toString("hex").padEnd(64, "0")}`;
  const releaseDelay = BigInt(7 * 24 * 60 * 60); // 7 days

  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const {
    writeContract: fund,
    data: fundHash,
    isPending: isFunding,
  } = useWriteContract();

  const { isLoading: isWaitingApprove, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isWaitingFund, isSuccess: fundSuccess } =
    useWaitForTransactionReceipt({ hash: fundHash });

  // Move to fund step after approval
  if (approveSuccess && step === "approve") {
    setStep("fund");
  }

  // Complete after funding
  if (fundSuccess && step === "fund") {
    setStep("done");
    onSuccess(fundHash!);
  }

  const handleApprove = () => {
    approve({
      address: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: "approve",
      args: [
        process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`,
        usdcAmount,
      ],
    });
  };

  const handleFund = () => {
    fund({
      address: process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: "createEscrow",
      args: [
        affiliateWallet as `0x${string}`,
        usdcAmount,
        referenceId as `0x${string}`,
        releaseDelay,
      ],
    });
  };

  const formatUSDC = (cents: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Contract Escrow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900">So funktioniert's:</h4>
          <ul className="mt-2 text-sm text-blue-800 space-y-1">
            <li>1. USDC wird im Smart Contract gesichert</li>
            <li>2. Nach Bestätigung wird automatisch ausgezahlt</li>
            <li>3. Falls keine Bestätigung: Auszahlung nach 7 Tagen</li>
            <li>4. Bei Streit: Plattform entscheidet</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Escrow-Betrag</span>
            <span className="font-semibold">{formatUSDC(amount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Plattformgebühr (1%)</span>
            <span>{formatUSDC(amount * 0.01)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Affiliate erhält</span>
            <span>{formatUSDC(amount * 0.99)}</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step === "approve" ? "text-blue-600" : "text-green-600"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "approve" ? "bg-blue-100" : "bg-green-100"
            }`}>
              {step === "approve" ? "1" : "✓"}
            </div>
            <span className="ml-2">Genehmigen</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          <div className={`flex items-center ${
            step === "fund" ? "text-blue-600" : step === "done" ? "text-green-600" : "text-gray-400"
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "fund" ? "bg-blue-100" : step === "done" ? "bg-green-100" : "bg-gray-100"
            }`}>
              {step === "done" ? "✓" : "2"}
            </div>
            <span className="ml-2">Einzahlen</span>
          </div>
        </div>

        {step === "approve" && (
          <Button
            onClick={handleApprove}
            disabled={isApproving || isWaitingApprove}
            className="w-full"
          >
            {isApproving || isWaitingApprove
              ? "Genehmige USDC..."
              : "USDC genehmigen"}
          </Button>
        )}

        {step === "fund" && (
          <Button
            onClick={handleFund}
            disabled={isFunding || isWaitingFund}
            className="w-full"
          >
            {isFunding || isWaitingFund
              ? "Erstelle Escrow..."
              : "Escrow erstellen"}
          </Button>
        )}

        {step === "done" && (
          <div className="text-center text-green-600">
            <p className="font-semibold">Escrow erstellt!</p>
            <p className="text-sm mt-1">
              Die Provision wird nach Bestätigung oder in 7 Tagen ausgezahlt.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Checklist

### Week 1
- [ ] Install Privy and wagmi
- [ ] Configure wallet providers
- [ ] Implement wallet linking component
- [ ] Backend signature verification
- [ ] Store linked wallets in database
- [ ] Direct USDC payment provider

### Week 2
- [ ] Write escrow smart contract
- [ ] Write comprehensive tests
- [ ] Deploy to Base Sepolia testnet
- [ ] Verify contract on Basescan
- [ ] Test all escrow functions

### Week 3
- [ ] Implement escrow payment provider
- [ ] Build blockchain event sync
- [ ] Create escrow payment UI
- [ ] Integration testing
- [ ] Security review
- [ ] Prepare for mainnet

---

## Success Criteria

1. ✅ Members can link MetaMask wallets
2. ✅ Direct USDC payments work
3. ✅ Escrow contract deployed and tested
4. ✅ Escrow funding flow works
5. ✅ Events sync to L4YERCAK3
6. ✅ Platform fees collected correctly

---

## Security Considerations

- [ ] Contract audited before mainnet
- [ ] Multi-sig for platform wallet
- [ ] Rate limiting on sync
- [ ] Monitoring for unusual activity
- [ ] Emergency pause functionality

---

## Next Phase

[Phase 4: Billing](./PHASE_4_BILLING.md) - Platform fee invoicing and reporting
