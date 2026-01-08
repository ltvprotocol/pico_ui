import React from 'react';
import { isUserRejected } from './isUserRejected';
import { Contract, ContractRunner, parseUnits, parseEther, formatUnits } from 'ethers';

// wstETH contract address on mainnet
export const WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';

// Minimal ABI for wstETH wrapping functionality
const WSTETH_ABI = [
  'function wrap(uint256 _stETHAmount) external returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

// stETH contract address on mainnet  
export const STETH_ADDRESS = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';

// Minimal ABI for stETH functionality
const STETH_ABI = [
  'function submit(address _referral) external payable returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function getTotalShares() external view returns (uint256)',
  'function getTotalPooledEther() external view returns (uint256)'
];

export interface WstETHWrapResult {
  wstEthContract: Contract;
  wstEthAmount: bigint;
}

export const wrapEthToWstEth = async (
  provider: ContractRunner | null,
  signer: ContractRunner | null,
  ethAmount: bigint,
  userAddress: string,
  setSuccess: React.Dispatch<React.SetStateAction<string>>,
  setError: React.Dispatch<React.SetStateAction<string>>
): Promise<WstETHWrapResult | null> => {
  
  if (!provider || !signer) {
    setError('Error: Provider or signer not available.');
    console.error('Unable to wrap ETH to wstETH without provider and signer');
    return null;
  }

  if (ethAmount <= 0n) {
    setError('Error: Invalid ETH amount.');
    console.error('Unable to wrap, reason: invalid ETH amount');
    return null;
  }

  setError('');

  try {
    // Create contract instances
    const wstEthContract = new Contract(WSTETH_ADDRESS, WSTETH_ABI, signer);

    // Send ETH to the wstETH contract address.
    // No special ABI interaction needed, just send ETH directly.
    const tx = await signer!.sendTransaction!({
      to: WSTETH_ADDRESS,
      value: ethAmount,
    });
    await tx.wait()

    const wstEthBalance = await wstEthContract.balanceOf(userAddress);

    setSuccess('Successfully wrapped ETH to wstETH!');
    
    return {
      wstEthContract,
      wstEthAmount: wstEthBalance
    };

  } catch (err) {
    if (isUserRejected(err)) {
      setError('Transaction canceled by user.');
    } else {
      setError('Failed to wrap ETH to wstETH.');
      console.error('Unknown error wrapping ETH to wstETH: ', err);
    }
    return null;
  }
};

export const isWstETHAddress = (address: string): boolean => {
  return address.toLowerCase() === WSTETH_ADDRESS.toLowerCase();
};

export const previewWrapEthToWstEth = async (
  provider: ContractRunner | null,
  ethAmount: bigint
): Promise<bigint | null> => {
  if (!provider || ethAmount <= 0n) {
    return null;
  }

  try {
    const stEthContract = new Contract(STETH_ADDRESS, STETH_ABI, provider);

    const totalShares: bigint = await stEthContract.getTotalShares();
    const totalPooledEther: bigint = await stEthContract.getTotalPooledEther(); 

    return (ethAmount * totalShares) / totalPooledEther;
  } catch (error) {
    console.error('Error previewing ETH to wstETH wrap:', error);
    return null;
  }
};

export const calculateEthNeededForWstEth = async (
  provider: ContractRunner | null,
  wstEthAmount: bigint
): Promise<bigint | null> => {
  if (!provider || wstEthAmount <= 0n) {
    return null;
  }

  try {
    const stEthContract = new Contract(STETH_ADDRESS, STETH_ABI, provider);

    const totalShares: bigint = await stEthContract.getTotalShares();
    const totalPooledEther: bigint = await stEthContract.getTotalPooledEther(); 

    return (wstEthAmount * totalPooledEther + totalShares - 1n) / totalShares;

  } catch (error) {
    console.error('Error calculating ETH needed for wstETH:', error);
    return null;
  }
};

export interface EthWrapCalculationParams {
  provider: ContractRunner | null;
  previewData: { amount: bigint } | null;
  collateralTokenBalance: string;
  collateralTokenDecimals: string | number | bigint;
  ethBalance: string;
  gasReserveWei: bigint;
}

export interface EthWrapCalculationResult {
  shouldWrap: boolean;
  ethToWrapValue: string;
  previewedWstEthAmount: bigint | null;
}

export const calculateEthWrapForFlashLoan = async ({
  provider,
  previewData,
  collateralTokenBalance,
  collateralTokenDecimals,
  ethBalance,
  gasReserveWei
}: EthWrapCalculationParams): Promise<EthWrapCalculationResult> => {
  const defaultResult = {
    shouldWrap: false,
    ethToWrapValue: '',
    previewedWstEthAmount: null
  };

  if (!previewData || !provider) {
    return defaultResult;
  }

  const wstETHToProvide = previewData.amount;

  let currentWstEthBalance = 0n;
  try {
    const decimals = typeof collateralTokenDecimals === 'bigint' 
      ? Number(collateralTokenDecimals) 
      : Number(collateralTokenDecimals);
    currentWstEthBalance = parseUnits(collateralTokenBalance || '0', decimals);
  } catch {
    currentWstEthBalance = 0n;
  }

  if (wstETHToProvide <= currentWstEthBalance) {
    return defaultResult;
  }

  let ethBalanceWei = 0n;
  try {
    ethBalanceWei = parseEther(ethBalance || '0');
  } catch {
    ethBalanceWei = 0n;
  }

  if (ethBalanceWei <= gasReserveWei) {
    return defaultResult;
  }

  const maxWrappableEth = ethBalanceWei - gasReserveWei;
  const missingWstEthAmount = wstETHToProvide - currentWstEthBalance;
  const ethNeeded = await calculateEthNeededForWstEth(provider, missingWstEthAmount);

  if (!ethNeeded || ethNeeded > maxWrappableEth) {
    return defaultResult;
  }

  const formattedEthNeeded = formatUnits(ethNeeded, 18);
  const previewedWstEthAmount = await previewWrapEthToWstEth(provider, ethNeeded);

  return {
    shouldWrap: true,
    ethToWrapValue: formattedEthNeeded,
    previewedWstEthAmount
  };
};