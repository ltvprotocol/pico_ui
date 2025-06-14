import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits } from 'ethers'
import { useAppContext } from './AppContext';

interface VaultContextType {
  decimals: bigint;
  maxDeposit: string;
  maxRedeem: string;
  maxMint: string;
  maxWithdraw: string;
  updateMaxDeposit: () => Promise<void>;
  updateMaxRedeem: () => Promise<void>;
  updateMaxMint: () => Promise<void>;
  updateMaxWithdraw: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultContextProvider = ({ children }: { children: ReactNode }) => {
  const [decimals, setDecimals] = useState<bigint>(18n);
  const [maxDeposit, setMaxDeposit] = useState<string>('');
  const [maxRedeem, setMaxRedeem] = useState<string>('');
  const [maxMint, setMaxMint] = useState<string>('');
  const [maxWithdraw, setMaxWithdraw] = useState<string>('');

  const { 
    publicProvider, isConnected, address, 
    wethContractLens, vaultContractLens
  } = useAppContext();

  const updateMaxDeposit = useCallback(async () => {
    if(!publicProvider || !address || !vaultContractLens || !wethContractLens) {
      console.error('Unable to call updateMaxDeposit');
      return;
    }

    const wethBalance = await wethContractLens.balanceOf(address);
    const vaultMaxDeposit = await vaultContractLens.maxDeposit(address);
    const ethBalance = await publicProvider.getBalance(address);

    const wethAmount = parseFloat(formatUnits(wethBalance, decimals));
    const ethAmount = parseFloat(formatUnits(ethBalance, decimals));
    const maxDepAmount = parseFloat(formatUnits(vaultMaxDeposit, decimals));

    const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
    const formattedMaxAvailable = maxAvailable.toFixed(4);

    if(formattedMaxAvailable !== maxDeposit) {
      setMaxDeposit(formattedMaxAvailable)
    }
  }, [publicProvider, address, vaultContractLens, wethContractLens, decimals]);

  const updateMaxRedeem = useCallback(async () => {
    if(!address || !vaultContractLens) {
      console.error('Unable to call updateMaxRedeem');
      return;
    }

    const gmeBalance = await vaultContractLens.balanceOf(address);
    const vaultMaxRedeem = await vaultContractLens.maxRedeem(address);

    const gmeAmount = parseFloat(formatUnits(gmeBalance, decimals));
    const maxRedeemAmount = parseFloat(formatUnits(vaultMaxRedeem, decimals));

    const maxAvailable = Math.min(gmeAmount, maxRedeemAmount);
    const truncated = Math.floor(maxAvailable * 10_000) / 10_000;
    const formattedMaxAvailable = truncated.toFixed(4);

    if(formattedMaxAvailable !== maxRedeem) {
      setMaxRedeem(formattedMaxAvailable)
    }
  }, [address, vaultContractLens, decimals]);

  const updateMaxMint = useCallback(async () => {
    if(!publicProvider || !address || !vaultContractLens || !wethContractLens) {
      console.error('Unable to call updateMaxMint');
      return;
    }

    const wethBalance = await wethContractLens.balanceOf(address);

    const vaultMaxMint = await vaultContractLens.maxMint(address);
    const ethBalance = await publicProvider.getBalance(address);
    const sharesForEth = await vaultContractLens.previewDeposit(ethBalance);
    const sharesForWeth = await vaultContractLens.previewDeposit(wethBalance);

    const ethSharesAmount = parseFloat(formatUnits(sharesForEth, decimals));
    const wethSharesAmount = parseFloat(formatUnits(sharesForWeth, decimals));
    const maxMintAmount = parseFloat(formatUnits(vaultMaxMint, decimals));

    const maxAvailable = Math.min(wethSharesAmount + ethSharesAmount, maxMintAmount);
    const formattedMaxAvailable = maxAvailable.toFixed(4);

    if(formattedMaxAvailable !== maxMint) {
      setMaxMint(formattedMaxAvailable)
    }
  }, [publicProvider, address, vaultContractLens, wethContractLens, decimals]);
  
  const updateMaxWithdraw = useCallback(async () => {
    if(!publicProvider || !address || !vaultContractLens) {
      console.error('Unable to call updateMaxWithdraw');
      return;
    }

    const gmeBalance = await vaultContractLens.balanceOf(address);

    const vaultMaxWithdraw = await vaultContractLens.maxWithdraw(address);
    const maxWithdrawAmount = parseFloat(formatUnits(vaultMaxWithdraw, decimals));

    const maxRedeem = await vaultContractLens.previewRedeem(gmeBalance);
    const maxRedeemAmount = parseFloat(formatUnits(maxRedeem, decimals))

    const maxAvailable = Math.min(maxRedeemAmount, maxWithdrawAmount);
    const truncated = Math.floor(maxAvailable * 10_000) / 10_000;
    const formattedMaxAvailable = truncated.toFixed(4);

    if(formattedMaxAvailable !== maxWithdraw) {
      setMaxWithdraw(formattedMaxAvailable)
    }
  }, [publicProvider, address, vaultContractLens, decimals]);


  useEffect(() => {
    const initialize = async () => {
      if (!wethContractLens || !isConnected) return;

      try {
        const newDecimals = await wethContractLens.decimals();
        setDecimals(newDecimals);

        await Promise.all([
          updateMaxDeposit(),
          updateMaxRedeem(),
          updateMaxMint(),
          updateMaxWithdraw(),
        ]);
      } catch (err) {
        console.error('VaultContext initialization error:', err);
      }
    };

    initialize();
  }, [wethContractLens, isConnected]);


  return (
    <VaultContext.Provider
      value={{
        decimals,
        maxDeposit,
        maxRedeem,
        maxMint,
        maxWithdraw,
        updateMaxDeposit,
        updateMaxRedeem,
        updateMaxMint,
        updateMaxWithdraw
      }}
    >
      {children}
    </VaultContext.Provider>
  )
};

export const useVaultContext = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVaultContext must be used within a VaultContextProvider');
  return context;
};