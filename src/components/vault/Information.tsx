import { useState } from 'react';
import { formatUnits } from 'ethers';

import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';
import { truncateTo4Decimals } from '@/utils';

export default function Information() {
  // const [error, setError] = useState<string | null>(null);

  const [maxDeposit, setMaxDeposit] = useState<string | null>(null);
  const [maxWithdraw, setMaxWithdraw] = useState<string | null>(null)
  const [maxMint, setMaxMint] = useState<string | null>(null)
  const [maxRedeem, setMaxRedeem] = useState<string | null>(null)
  const [maxDepositCollateral, setMaxDepositCollateral] = useState<string | null>(null)
  const [maxWithdrawCollateral, setMaxWithdrawCollateral] = useState<string | null>(null)
  const [maxMintCollateral, setMaxMintCollateral] = useState<string | null>(null)
  const [maxRedeemCollateral, setMaxRedeemCollateral] = useState<string | null>(null)
  const [totalAssets, setTotalAssets] = useState<string | null>(null)

  const { address, isConnected } = useAppContext();
  const { vaultLens, sharesSymbol, borrowTokenSymbol, collateralTokenSymbol } = useVaultContext();

  const getVaultInformation = async () => {
    if (!address || !vaultLens) return;

    // setError(null);

    try {
      const [
        maxDeposit, maxWithdraw, maxMint, maxRedeem, 
        maxDepositCollateral, maxWithdrawCollateral, maxMintCollateral, maxRedeemCollateral,
        assets, decimals
      ] = await Promise.all([
        vaultLens.maxDeposit(address),
        vaultLens.maxWithdraw(address),
        vaultLens.maxMint(address),
        vaultLens.maxRedeem(address),
        vaultLens.maxDepositCollateral(address),
        vaultLens.maxWithdrawCollateral(address),
        vaultLens.maxMintCollateral(address),
        vaultLens.maxRedeemCollateral(address),
        vaultLens.totalAssets(),
        vaultLens.decimals()
      ]);

      setMaxDeposit(
        truncateTo4Decimals(parseFloat(formatUnits(maxDeposit, decimals)))
      );
      setMaxWithdraw(
        truncateTo4Decimals(parseFloat(formatUnits(maxWithdraw, decimals)))
      );
      setMaxMint(
        truncateTo4Decimals(parseFloat(formatUnits(maxMint, decimals)))
      );
      setMaxRedeem(
        truncateTo4Decimals(parseFloat(formatUnits(maxRedeem, decimals)))
      );

      setMaxDepositCollateral(
        truncateTo4Decimals(parseFloat(formatUnits(maxDepositCollateral, decimals)))
      );
      setMaxWithdrawCollateral(
        truncateTo4Decimals(parseFloat(formatUnits(maxWithdrawCollateral, decimals)))
      );
      setMaxMintCollateral(
        truncateTo4Decimals(parseFloat(formatUnits(maxMintCollateral, decimals)))
      );
      setMaxRedeemCollateral(
        truncateTo4Decimals(parseFloat(formatUnits(maxRedeemCollateral, decimals)))
      );

      setTotalAssets(parseFloat(formatUnits(assets, decimals)).toFixed(4));
    } catch (err) {
      console.error('Error fetching vault info:', err);
      // setError('An error occurred');
    }
  };

  useAdaptiveInterval(getVaultInformation, {
    enabled: isConnected
  });

  return (
    <div className="relative rounded-lg mb-4 bg-gray-50 p-3">
      <div className="">
        <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
        <div className="w-full flex items-end justify-between text-sm text-gray-600 mb-2">
          <div>
            <div>Max Deposit:</div>
            <div>Max Withdraw:</div>
            <div>Max Mint:</div>
            <div>Max Redeem:</div>
          </div>
          <div className="flex">
            <div className="flex flex-col items-end mr-2">
              <div className="mb-2">Collateral: </div>
              {[
                [maxDepositCollateral, collateralTokenSymbol],
                [maxWithdrawCollateral, collateralTokenSymbol],
                [maxMintCollateral, sharesSymbol],
                [maxRedeemCollateral, sharesSymbol]
              ].map((info, index) => (
                <div key={index} className='flex'>
                  <div className="mr-2">{info[0] ? info[0] : "..."}</div>
                  <div className="font-medium text-gray-700">{info[1] ? info[1] : "..."}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-end">
              <div className="mb-2">Borrow: </div>
              {[
                [maxDeposit, borrowTokenSymbol],
                [maxWithdraw, borrowTokenSymbol],
                [maxMint, sharesSymbol],
                [maxRedeem, sharesSymbol]
              ].map((info, index) => (
                <div key={index} className="flex">
                  <div className="mr-2">{info[0] ? info[0] : "..."}</div>
                  <div className="font-medium text-gray-700">{info[1] ? info[1] : "..."}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm mb-2">
          <div>TVL:</div>
          <div className='flex'>
            <div className="mr-2">{totalAssets ? totalAssets : "..."}</div>
            <div className="font-medium text-gray-700">{borrowTokenSymbol ? borrowTokenSymbol : "..."}</div>
          </div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div>Target LTV:</div>
          <div>0.75</div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div>Max Safe LTV:</div>
          <div>0.90</div>
        </div>
        <div className="w-full flex justify-between items-center text-sm">
          <div>Min Profit LTV:</div>
          <div>0.50</div>
        </div>
      </div>
    </div>
  );
}