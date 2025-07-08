import { useState } from 'react';
import { formatUnits, formatEther } from 'ethers';
import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';
import { truncateTo4Decimals } from '@/utils';

export default function Balances() {
  const [sharesBalance, setSharesBalance] = useState<string>('0');
  const [borrowTokenBalance, setBorrowTokenBalance] = useState<string>('0');
  const [collateralTokenBalance, setCollateralTokenBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');

  const { isConnected, publicProvider, address } = useAppContext();
  const {
    decimals, vaultLens, borrowTokenLens, collateralTokenLens,
    sharesSymbol, borrowTokenSymbol, collateralTokenSymbol
  } = useVaultContext();

  const resetBalances = () => {
    setSharesBalance('0');
    setBorrowTokenBalance('0');
    setCollateralTokenBalance('0');
    setEthBalance('0');
  };

  const getBalances = async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens || !collateralTokenLens) return;

    try {
      const ethBalanceRaw = await publicProvider.getBalance(address);
      const currentEthBalance = parseFloat(formatEther(ethBalanceRaw));
      setEthBalance(truncateTo4Decimals(currentEthBalance));

      const [
        sharesBalanceRaw,
        borrowTokenBalanceRaw,
        collateralTokenBalanceRaw,
      ] = await Promise.all([
        vaultLens.balanceOf(address),
        borrowTokenLens.balanceOf(address),
        collateralTokenLens.balanceOf(address),
      ]);

      const currentSharesBalance = parseFloat(formatUnits(sharesBalanceRaw, decimals));
      const currentBorrowTokenBalance = parseFloat(formatUnits(borrowTokenBalanceRaw, decimals));
      const currentCollateralTokenBalance = parseFloat(formatUnits(collateralTokenBalanceRaw, decimals));

      setSharesBalance(truncateTo4Decimals(currentSharesBalance));
      setBorrowTokenBalance(truncateTo4Decimals(currentBorrowTokenBalance));
      setCollateralTokenBalance(truncateTo4Decimals(currentCollateralTokenBalance));
    } catch (err) {
      console.error('Error fetching balances:', err);
      resetBalances();
    }
  };

  useAdaptiveInterval(getBalances, {
    enabled: isConnected,
  });

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="w-full flex flex-col">
        <div className="w-full space-y-1">
          <h3 className="text-lg font-medium text-gray-900">Balances:</h3>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Ethers: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(ethBalance).toFixed(4)}</div>
              <div className="font-medium text-gray-700">ETH</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Shares: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(sharesBalance).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{sharesSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Borrow Token: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(borrowTokenBalance).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{borrowTokenSymbol}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Collateral Token: </div>
            <div className="flex">
              <div className="mr-2">{parseFloat(collateralTokenBalance).toFixed(4)}</div>
              <div className="font-medium text-gray-700">{collateralTokenSymbol}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}