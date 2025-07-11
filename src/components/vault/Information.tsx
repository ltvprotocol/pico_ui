import { useState } from 'react';
import { formatUnits } from 'ethers';

import { useAppContext, useVaultContext } from '@/contexts';
import { useAdaptiveInterval } from '@/hooks';
import { truncate } from '@/utils';

import { Loader } from '@/components/ui';

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

  const [targetLtv, setTargetLtv] = useState<string | null>(null);
  const [maxSafeLtv, setMaxSafeLtv] = useState<string | null>(null);
  const [minProfitLtv, setMinProfitLtv] = useState<string | null>(null);

  const { address, isConnected } = useAppContext();
  const { vaultLens, sharesSymbol, borrowTokenSymbol, collateralTokenSymbol, decimals, vaultConfig } = useVaultContext();

  const getVaultInformation = async () => {
    if (!address || !vaultLens) return;

    // setError(null);

    if (vaultConfig?.targetLTV) {
      setTargetLtv(vaultConfig.targetLTV);
    } else {
      const rawTargetLtv = await vaultLens.targetLTV();
      const newTargetLtv = truncate(parseFloat(formatUnits(rawTargetLtv, 18)), 2);
      setTargetLtv(newTargetLtv);
    }

    if (vaultConfig?.maxSafeLTV) {
      setMaxSafeLtv(vaultConfig.maxSafeLTV);
    } else {
      const rawMaxSafeLtv = await vaultLens.maxSafeLTV();
      const newMaxSafeLtv = truncate(parseFloat(formatUnits(rawMaxSafeLtv, 18)), 2);
      setMaxSafeLtv(newMaxSafeLtv);
    }

    if (vaultConfig?.minProfitLTV) {
      setMinProfitLtv(vaultConfig.minProfitLTV);
    } else {
      const rawMinProfitLtv = await vaultLens.minProfitLTV();
      const newMinProfitLtv = truncate(parseFloat(formatUnits(rawMinProfitLtv, 18)), 2);
      setMinProfitLtv(newMinProfitLtv);
    }

    try {
      const [
        maxDeposit, maxWithdraw, maxMint, maxRedeem, 
        maxDepositCollateral, maxWithdrawCollateral, maxMintCollateral, maxRedeemCollateral,
        assets
      ] = await Promise.all([
        vaultLens.maxDeposit(address),
        vaultLens.maxWithdraw(address),
        vaultLens.maxMint(address),
        vaultLens.maxRedeem(address),
        vaultLens.maxDepositCollateral(address),
        vaultLens.maxWithdrawCollateral(address),
        vaultLens.maxMintCollateral(address),
        vaultLens.maxRedeemCollateral(address),
        vaultLens.totalAssets()
      ]);

      setMaxDeposit(
        truncate(parseFloat(formatUnits(maxDeposit, decimals)), 4)
      );
      setMaxWithdraw(
        truncate(parseFloat(formatUnits(maxWithdraw, decimals)), 4)
      );
      setMaxMint(
        truncate(parseFloat(formatUnits(maxMint, decimals)), 4)
      );
      setMaxRedeem(
        truncate(parseFloat(formatUnits(maxRedeem, decimals)), 4)
      );

      setMaxDepositCollateral(
        truncate(parseFloat(formatUnits(maxDepositCollateral, decimals)), 4)
      );
      setMaxWithdrawCollateral(
        truncate(parseFloat(formatUnits(maxWithdrawCollateral, decimals)), 4)
      );
      setMaxMintCollateral(
        truncate(parseFloat(formatUnits(maxMintCollateral, decimals)), 4)
      );
      setMaxRedeemCollateral(
        truncate(parseFloat(formatUnits(maxRedeemCollateral, decimals)), 4)
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
      <h3 className="text-lg font-medium text-gray-900">Vault Information</h3>
      <div className="w-full hidden sm:flex items-end justify-between text-sm text-gray-600 mb-2">
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
                <div className="mr-2">{info[0] ? info[0] : <Loader />}</div>
                <div className="font-medium text-gray-700">{info[1] ? info[1] : <Loader />}</div>
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
                <div className="mr-2">{info[0] ? info[0] : <Loader />}</div>
                <div className="font-medium text-gray-700">{info[1] ? info[1] : <Loader />}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full sm:hidden text-sm text-gray-600 mt-2 mb-2">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="font-medium text-gray-700">Action</div>
            <div>Deposit:</div>
            <div>Withdraw:</div>
            <div>Mint:</div>
            <div>Redeem:</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-medium text-gray-700">Max for Collateral</div>
            {[
              [maxDepositCollateral, collateralTokenSymbol],
              [maxWithdrawCollateral, collateralTokenSymbol],
              [maxMintCollateral, sharesSymbol],
              [maxRedeemCollateral, sharesSymbol]
            ].map((info, index) => (
              <div key={index} className='flex'>
                <div className="mr-2">{info[0] ? info[0] : <Loader />}</div>
                <div className="font-medium text-gray-700">{info[1] ? info[1] : <Loader />}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="font-medium text-gray-700">Action</div>
            <div>Deposit:</div>
            <div>Withdraw:</div>
            <div>Mint:</div>
            <div>Redeem:</div>
          </div>
          <div className="flex flex-col items-end">
            <div className="font-medium text-gray-700">Max for Borrow</div>
            {[
              [maxDeposit, borrowTokenSymbol],
              [maxWithdraw, borrowTokenSymbol],
              [maxMint, sharesSymbol],
              [maxRedeem, sharesSymbol]
            ].map((info, index) => (
              <div key={index} className="flex">
                <div className="mr-2">{info[0] ? info[0] : <Loader />}</div>
                <div className="font-medium text-gray-700">{info[1] ? info[1] : <Loader />}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm mb-2">
        <div>TVL:</div>
        <div className='flex'>
          <div className="mr-2">{totalAssets ? totalAssets : <Loader />}</div>
          <div className="font-medium text-gray-700">{borrowTokenSymbol ? <div>{borrowTokenSymbol}</div> : <Loader />}</div>
        </div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Target LTV:</div>
        <div>{targetLtv ? <div>{targetLtv}</div> : <Loader />}</div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Max Safe LTV:</div>
        <div>{maxSafeLtv ? <div>{maxSafeLtv}</div> : <Loader />}</div>
      </div>
      <div className="w-full flex justify-between items-center text-sm">
        <div>Min Profit LTV:</div>
        <div>{minProfitLtv ? <div>{minProfitLtv}</div> : <Loader />}</div>
      </div>
    </div>
  );
}