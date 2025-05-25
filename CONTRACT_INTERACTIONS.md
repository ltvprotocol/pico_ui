# Contract Interactions Documentation

## Contract Addresses

- GME Vault Contract: `0xe2a7f267124ac3e4131f27b9159c78c521a44f3c`
- WETH Contract: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## Network Configuration

The application operates on the Sepolia testnet:
- Chain ID: `0xaa36a7` (11155111)
- Network Name: Sepolia
- Native Currency: SepoliaETH (SEP)
- RPC URL: https://rpc.sepolia.org
- Block Explorer: https://sepolia.etherscan.io

## Contract Interactions

### 1. Wallet Connection and Network Management

#### MetaMask Integration
- Uses `window.ethereum` provider
- Handles account changes and network switching
- Monitors wallet connection status

#### Network Management
```typescript
// Switch to Sepolia network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }]
});

// Add Sepolia network if not present
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [SEPOLIA_NETWORK]
});
```

### 2. Token Interactions

#### WETH Contract
```typescript
// Contract Interface
const wethContract = new ethers.Contract(
  WETH_ADDRESS,
  [
    'function deposit() payable',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)'
  ],
  signer
);

// Key Functions
- deposit(): Wraps ETH to WETH
- approve(): Approves vault to spend WETH
- balanceOf(): Gets WETH balance
- decimals(): Gets token decimals
```

#### GME Vault Contract
```typescript
// Contract Interface
const vaultContract = new ethers.Contract(
  GME_VAULT_ADDRESS,
  [
    'function deposit(uint256 assets, address receiver) returns (uint256)',
    'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
    'function maxDeposit(address) view returns (uint256)',
    'function maxRedeem(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function asset() view returns (address)'
  ],
  signer
);

// Key Functions
- deposit(): Deposits assets into vault
- redeem(): Redeems shares from vault
- maxDeposit(): Gets maximum deposit amount
- maxRedeem(): Gets maximum redeem amount
```

### 3. Transaction Flow

#### Deposit Flow
1. Check wallet connection and network
2. Get WETH balance and decimals
3. If needed, wrap ETH to WETH
4. Approve vault to spend WETH
5. Execute deposit transaction

```typescript
// Deposit Process
const amountWei = ethers.utils.parseUnits(amount, decimals);
await wethContract.approve(TOKEN_ADDRESS, amountWei);
const depositTx = await vaultContract.deposit(amountWei, receiverAddress);
await depositTx.wait();
```

#### Redeem Flow
1. Check wallet connection and network
2. Get GME balance and decimals
3. Verify sufficient balance
4. Execute redeem transaction

```typescript
// Redeem Process
const amountWei = ethers.utils.parseUnits(amount, decimals);
const redeemTx = await vaultContract.redeem(
  amountWei,
  receiverAddress,
  ownerAddress
);
await redeemTx.wait();
```

### 4. Balance Monitoring

The application continuously monitors:
- ETH balance
- WETH balance
- GME token balance
- Maximum deposit capacity
- Maximum redeem capacity

### 5. Error Handling

The application handles various error scenarios:
- Network connection issues
- Insufficient balances
- Transaction failures
- Contract interaction errors
- Network switching failures

### 6. Security Considerations

1. Always verify contract addresses before interaction
2. Use MetaMask's built-in security features
3. Implement proper error handling
4. Validate user inputs
5. Check network compatibility
6. Monitor transaction status

## Best Practices

1. Always check wallet connection before transactions
2. Verify network is Sepolia before operations
3. Handle all possible error states
4. Provide clear user feedback
5. Implement proper loading states
6. Monitor transaction confirmations 