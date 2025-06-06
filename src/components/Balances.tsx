import { useState, useEffect } from 'react';
import { formatUnits, formatEther } from 'ethers';
import { useAppContext } from '@/context/AppContext';

export default function Balances() {
  const [gmeBalance, setGmeBalance] = useState<string>('0');
  const [wethBalance, setWethBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');

  const { isConnected, publicProvider, address, vaultContractLens, wethContractLens } = useAppContext();

  const resetBalances = () => {
    setEthBalance('0');
    setGmeBalance('0');
    setWethBalance('0');
  };

  const getBalances = async () => {
    if(!publicProvider && !address && !vaultContractLens && !wethContractLens) return;

    try {
      const ethBalanceRaw = await publicProvider!.getBalance(address!);
      const formattedEthBalance = formatEther(ethBalanceRaw);
      setEthBalance(formattedEthBalance);
  
      const [gmeBalanceRaw, gmeDecimals, wethBalanceRaw, wethDecimals] = await Promise.all([
        vaultContractLens!.balanceOf(address!),
        vaultContractLens!.decimals(),
        wethContractLens!.balanceOf(address!),
        wethContractLens!.decimals()
      ]);
  
      const formattedGmeBalance = formatUnits(gmeBalanceRaw, gmeDecimals);
      const formattedWethBalance = formatUnits(wethBalanceRaw, wethDecimals);
  
      setGmeBalance(formattedGmeBalance);
      setWethBalance(formattedWethBalance);
    } catch (err) {
      console.error('Error fetching balances:', err);
      resetBalances();
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      getBalances();
    }, 1000);
    return () => clearInterval(interval);
  }, [isConnected]); 

  return (
    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md mt-4">
      <div className="flex flex-col">
        <div className="mt-2 space-y-1">
          <h3 className="text-lg font-medium text-gray-900">Balances:</h3>
          <span className="text-sm text-gray-600">
            ETH Balance: {parseFloat(ethBalance).toFixed(4)} ETH
          </span>
          <span className="text-sm text-gray-600 block">
            WETH Balance: {parseFloat(wethBalance).toFixed(4)} WETH
          </span>
          <span className="text-sm text-gray-600 block">
            GME Balance: {parseFloat(gmeBalance).toFixed(4)} GME
          </span>
        </div>
      </div>
    </div>
  );
}