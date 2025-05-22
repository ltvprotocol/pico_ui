# Pico UI - LTV Vault Frontend

A React-based frontend for interacting with LTV Protocol vaults.

## Features

- Connect to MetaMask wallet
- Deposit assets into LTV vaults
- View transaction status and errors
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js (v18 or later)
- MetaMask browser extension
- Access to the LTV Protocol testnet

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the contract addresses in `src/App.tsx`:
   - Replace `vaultAddress` with your LTV vault contract address
   - Replace `assetAddress` with your asset token contract address

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Build the application:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Connect your MetaMask wallet to the LTV Protocol testnet
2. Enter the amount of assets you want to deposit
3. Approve the token spending (first-time only)
4. Confirm the deposit transaction

## Security

- Always verify contract addresses before interacting
- Never share your private keys or seed phrases
- Use MetaMask's built-in security features
