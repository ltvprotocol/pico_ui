import { useState } from 'react';
import { formatUnits, formatEther } from 'ethers';

import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';
import { truncateTo4Decimals } from '@/utils';

export default function Balances() {
  const [sharesBalance, setSharesBalance] = useState<string | null>(null);
  const [borrowTokenBalance, setBorrowTokenBalance] = useState<string | null>(null);
  const [collateralTokenBalance, setCollateralTokenBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);

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
    <div className="relative rounded-lg bg-gray-50 p-3">
      <div className="flex flex-col w-full space-y-1">
          <h3 className="text-lg font-medium text-gray-900">Your Balances</h3>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Ethers:</div>
            <div className="flex">
              <div className="mr-2">{ethBalance ? ethBalance : "..."}</div>
              <div className="font-medium text-gray-700">ETH</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Shares:</div>
            <div className="flex">
              <div className="mr-2">{sharesBalance ? sharesBalance : "..."}</div>
              <div className="font-medium text-gray-700">{sharesSymbol ? sharesSymbol : "..."}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Borrow Token:</div>
            <div className="flex">
              <div className="mr-2">{borrowTokenBalance ? borrowTokenBalance : "..."}</div>
              <div className="font-medium text-gray-700">{borrowTokenSymbol ? borrowTokenSymbol : "..."}</div>
            </div>
          </div>
          <div className="w-full flex justify-between text-sm text-gray-600">
            <div>Collateral Token:</div>
            <div className="flex">
              <div className="mr-2">{collateralTokenBalance ? collateralTokenBalance : "..."}</div>
              <div className="font-medium text-gray-700">{collateralTokenSymbol ? collateralTokenSymbol : "..."}</div>
            </div>
          </div>
        </div>
    </div>
  );
}
