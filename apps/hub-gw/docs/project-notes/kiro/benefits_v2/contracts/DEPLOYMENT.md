# Smart Contract Deployment Guide

## Prerequisites

1. **Install Foundry**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Get USDC Contract Addresses**
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

3. **Prepare Environment Variables**
```bash
# .env
DEPLOYER_PRIVATE_KEY=0x...
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
FEE_RECIPIENT=0x... # L4YERCAK3 platform wallet
BASESCAN_API_KEY=...
```

---

## Testnet Deployment (Base Sepolia)

### 1. Initialize Foundry Project

```bash
cd contracts
forge init --no-git
```

### 2. Install Dependencies

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

### 3. Create Deployment Script

```solidity
// script/Deploy.s.sol
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

        console.log("========================================");
        console.log("GWCommissionEscrow deployed at:", address(escrow));
        console.log("USDC Address:", usdc);
        console.log("Fee Recipient:", feeRecipient);
        console.log("========================================");

        vm.stopBroadcast();
    }
}
```

### 4. Run Tests

```bash
forge test -vvv
```

### 5. Deploy to Sepolia

```bash
source .env

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 6. Verify Deployment

```bash
# Check contract on Basescan
open "https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS"

# Test interaction
cast call $CONTRACT_ADDRESS "platformFeeBps()" --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## Mainnet Deployment (Base)

### Pre-flight Checklist

- [ ] All tests passing
- [ ] Testnet deployment working
- [ ] Audit completed
- [ ] Fee recipient wallet secured
- [ ] Deployer wallet funded with ETH

### 1. Update Environment

```bash
# Update .env
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### 2. Deploy to Mainnet

```bash
source .env

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 3. Verify on Basescan

```bash
forge verify-contract \
  --chain base \
  --compiler-version v0.8.20 \
  --constructor-args $(cast abi-encode "constructor(address,address)" $USDC_ADDRESS $FEE_RECIPIENT) \
  $CONTRACT_ADDRESS \
  src/GWCommissionEscrow.sol:GWCommissionEscrow
```

### 4. Post-Deployment Setup

```bash
# Transfer ownership to multi-sig (recommended)
cast send $CONTRACT_ADDRESS "transferOwnership(address)" $MULTISIG_ADDRESS \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

---

## Contract Addresses

### Testnet (Base Sepolia)
| Contract | Address |
|----------|---------|
| GWCommissionEscrow | TBD |
| USDC | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |

### Mainnet (Base)
| Contract | Address |
|----------|---------|
| GWCommissionEscrow | TBD |
| USDC | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |

---

## Emergency Procedures

### Pause Contract

```bash
cast send $CONTRACT_ADDRESS "pause()" \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

### Unpause Contract

```bash
cast send $CONTRACT_ADDRESS "unpause()" \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

### Update Fee (max 5%)

```bash
# Set to 1.5% (150 basis points)
cast send $CONTRACT_ADDRESS "setPlatformFee(uint256)" 150 \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $BASE_RPC_URL
```

---

## Monitoring

### Set Up Tenderly

1. Create Tenderly account
2. Add contract to monitoring
3. Set up alerts for:
   - EscrowCreated events
   - EscrowReleased events
   - EscrowDisputed events
   - Low contract balance
   - Failed transactions

### Alchemy Webhooks

1. Go to Alchemy Dashboard
2. Create webhook for contract address
3. Subscribe to:
   - Address Activity
   - Mined Transactions

---

## Audit Recommendations

Before mainnet deployment, get the contract audited:

### Cost-Effective Options
- **Code4rena** - Competitive audits
- **Sherlock** - Pay-per-vulnerability
- **CodeHawks** - Community audits

### Premium Options
- **OpenZeppelin** - Gold standard
- **Trail of Bits** - Deep expertise
- **Consensys Diligence** - Comprehensive

### Minimum Audit Scope
1. Reentrancy vulnerabilities
2. Access control issues
3. Integer overflow/underflow
4. Token handling edge cases
5. State machine correctness
6. Economic attack vectors

---

## Gas Optimization Notes

| Function | Gas Cost (approx) |
|----------|-------------------|
| createEscrow | ~150,000 |
| releaseByMerchant | ~80,000 |
| claimByAffiliate | ~80,000 |
| raiseDispute | ~50,000 |
| resolveDispute | ~80,000 |

At $0.001 per gas unit on Base, typical costs:
- Create escrow: ~$0.15
- Release: ~$0.08
- Dispute: ~$0.05
