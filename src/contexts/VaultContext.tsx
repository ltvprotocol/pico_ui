import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits } from 'ethers'
import { useAppContext } from '@/contexts/AppContext';
import { Vault, WETH, ERC20, Vault__factory, WETH__factory, ERC20__factory } from '@/typechain-types';
import { truncateTo4Decimals } from '@/utils';

interface VaultContextType {
  sharesSymbol: string;
  borrowTokenSymbol: string;
  collateralTokenSymbol: string;
  vault: Vault | null;
  borrowToken: WETH | null;
  collateralToken: ERC20 | null;
  vaultLens: Vault | null;
  borrowTokenLens: WETH | null;
  collateralTokenLens: ERC20 | null;
  decimals: bigint;
  maxDeposit: string;
  maxRedeem: string;
  maxMint: string;
  maxWithdraw: string;
  maxDepositCollateral: string;
  maxRedeemCollateral: string;
  maxMintCollateral: string;
  maxWithdrawCollateral: string;
  updateMaxDeposit: () => Promise<void>;
  updateMaxRedeem: () => Promise<void>;
  updateMaxMint: () => Promise<void>;
  updateMaxWithdraw: () => Promise<void>;
  updateMaxDepositCollateral: () => Promise<void>;
  updateMaxRedeemCollateral: () => Promise<void>;
  updateMaxMintCollateral: () => Promise<void>;
  updateMaxWithdrawCollateral: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultContextProvider = ({ children, vaultAddress }: { children: ReactNode, vaultAddress: string }) => {
  const [sharesSymbol, setSharesSymbol] = useState<string>('');
  const [borrowTokenSymbol, setBorrowTokenSymbol] = useState<string>('');
  const [collateralTokenSymbol, setCollateralTokenSymbol] = useState<string>('');
  const [contractsSet, setContractsSet] = useState(false);

  const [vault, setVault] = useState<Vault | null>(null);
  const [borrowToken, setBorrowToken] = useState<WETH | null>(null);
  const [collateralToken, setCollateralToken] = useState<ERC20 | null>(null);
  const [vaultLens, setVaultLens] = useState<Vault | null>(null);
  const [borrowTokenLens, setBorrowTokenLens] = useState<WETH | null>(null);
  const [collateralTokenLens, setCollateralTokenLens] = useState<ERC20 | null>(null);

  const [decimals, setDecimals] = useState<bigint>(18n);
  const [maxDeposit, setMaxDeposit] = useState<string>('');
  const [maxRedeem, setMaxRedeem] = useState<string>('');
  const [maxMint, setMaxMint] = useState<string>('');
  const [maxWithdraw, setMaxWithdraw] = useState<string>('');
  const [maxDepositCollateral, setMaxDepositCollateral] = useState<string>('');
  const [maxRedeemCollateral, setMaxRedeemCollateral] = useState<string>('');
  const [maxMintCollateral, setMaxMintCollateral] = useState<string>('');
  const [maxWithdrawCollateral, setMaxWithdrawCollateral] = useState<string>('');

  const { publicProvider, signer, isConnected, address } = useAppContext();

  const updateMaxDeposit = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens) return;

    const wethBalance = await borrowTokenLens.balanceOf(address);
    const vaultMaxDeposit = await vaultLens.maxDeposit(address);
    const ethBalance = await publicProvider.getBalance(address);

    const wethAmount = parseFloat(formatUnits(wethBalance, decimals));
    const ethAmount = parseFloat(formatUnits(ethBalance, decimals));
    const maxDepAmount = parseFloat(formatUnits(vaultMaxDeposit, decimals));

    const maxAvailable = Math.min(wethAmount + ethAmount, maxDepAmount);
    setMaxDeposit(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, borrowTokenLens, decimals]);

  const updateMaxRedeem = useCallback(async () => {
    if (!address || !vaultLens) return;

    const gmeBalance = await vaultLens.balanceOf(address);
    const vaultMaxRedeem = await vaultLens.maxRedeem(address);

    const gmeAmount = parseFloat(formatUnits(gmeBalance, decimals));
    const maxRedeemAmount = parseFloat(formatUnits(vaultMaxRedeem, decimals));

    const maxAvailable = Math.min(gmeAmount, maxRedeemAmount);
    setMaxRedeem(truncateTo4Decimals(maxAvailable));
  }, [address, vaultLens, decimals]);

  const updateMaxMint = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens) return;

    const wethBalance = await borrowTokenLens.balanceOf(address);
    const vaultMaxMint = await vaultLens.maxMint(address);
    const ethBalance = await publicProvider.getBalance(address);

    const sharesForEth = await vaultLens.previewDeposit(ethBalance);
    const sharesForWeth = await vaultLens.previewDeposit(wethBalance);

    const ethSharesAmount = parseFloat(formatUnits(sharesForEth, decimals));
    const wethSharesAmount = parseFloat(formatUnits(sharesForWeth, decimals));
    const maxMintAmount = parseFloat(formatUnits(vaultMaxMint, decimals));

    const maxAvailable = Math.min(wethSharesAmount + ethSharesAmount, maxMintAmount);
    setMaxMint(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, borrowTokenLens, decimals]);

  const updateMaxWithdraw = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens) return;

    const gmeBalance = await vaultLens.balanceOf(address);
    const vaultMaxWithdraw = await vaultLens.maxWithdraw(address);

    const maxRedeem = await vaultLens.previewRedeem(gmeBalance);
    const maxRedeemAmount = parseFloat(formatUnits(maxRedeem, decimals));
    const maxWithdrawAmount = parseFloat(formatUnits(vaultMaxWithdraw, decimals));

    const maxAvailable = Math.min(maxRedeemAmount, maxWithdrawAmount);
    setMaxWithdraw(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, decimals]);

  const updateMaxDepositCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !collateralTokenLens) return;

    const collateralBalance = await collateralTokenLens.balanceOf(address);
    const vaultMaxDeposit = await vaultLens.maxDepositCollateral(address);

    const collateralAmount = parseFloat(formatUnits(collateralBalance, decimals));
    const maxDepAmount = parseFloat(formatUnits(vaultMaxDeposit, decimals));

    const maxAvailable = Math.min(collateralAmount, maxDepAmount);
    setMaxDepositCollateral(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, collateralTokenLens, decimals]);

  const updateMaxRedeemCollateral = useCallback(async () => {
    if (!address || !vaultLens) return;

    const sharesBalance = await vaultLens.balanceOf(address);
    const vaultMaxRedeem = await vaultLens.maxRedeemCollateral(address);

    const sharesAmount = parseFloat(formatUnits(sharesBalance, decimals));
    const maxRedeemAmount = parseFloat(formatUnits(vaultMaxRedeem, decimals));

    const maxAvailable = Math.min(sharesAmount, maxRedeemAmount);
    setMaxRedeemCollateral(truncateTo4Decimals(maxAvailable));
  }, [address, vaultLens, decimals]);

  const updateMaxMintCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !collateralTokenLens) return;

    const collateralBalance = await collateralTokenLens.balanceOf(address);
    const vaultMaxMint = await vaultLens.maxMintCollateral(address);
    const sharesForCollateral = await vaultLens.previewDepositCollateral(collateralBalance);

    const collateralSharesAmount = parseFloat(formatUnits(sharesForCollateral, decimals));
    const maxMintAmount = parseFloat(formatUnits(vaultMaxMint, decimals));

    const maxAvailable = Math.min(collateralSharesAmount, maxMintAmount);
    setMaxMintCollateral(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, collateralTokenLens, decimals]);

  const updateMaxWithdrawCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens) return;

    const sharesBalance = await vaultLens.balanceOf(address);
    const maxRedeem = await vaultLens.previewRedeemCollateral(sharesBalance);
    const vaultMaxWithdraw = await vaultLens.maxWithdrawCollateral(address);

    const maxRedeemAmount = parseFloat(formatUnits(maxRedeem, decimals));
    const maxWithdrawAmount = parseFloat(formatUnits(vaultMaxWithdraw, decimals));

    const maxAvailable = Math.min(maxRedeemAmount, maxWithdrawAmount);
    setMaxWithdrawCollateral(truncateTo4Decimals(maxAvailable));
  }, [publicProvider, address, vaultLens, decimals]);

  const setupContracts = async () => {
    if (!publicProvider) return;

    try {
      const vaultLens = Vault__factory.connect(vaultAddress, publicProvider);
      const borrowTokenAddress = await vaultLens.borrowToken();
      const collateralTokenAddress = await vaultLens.collateralToken();
      
      const borrowTokenLensInstance = WETH__factory.connect(borrowTokenAddress, publicProvider);
      const collateralTokenLensInstance = ERC20__factory.connect(collateralTokenAddress, publicProvider);

      setVaultLens(vaultLens);
      setBorrowTokenLens(borrowTokenLensInstance);
      setCollateralTokenLens(collateralTokenLensInstance);

      const newDecimals = await borrowTokenLensInstance.decimals();
      setDecimals(newDecimals);

      await Promise.all([
        updateMaxDeposit(),
        updateMaxRedeem(),
        updateMaxMint(),
        updateMaxWithdraw(),
        updateMaxDepositCollateral(),
        updateMaxRedeemCollateral(),
        updateMaxMintCollateral(),
        updateMaxWithdrawCollateral()
      ]);

      if (signer) {
        setVault(Vault__factory.connect(vaultAddress, signer));
        setBorrowToken(WETH__factory.connect(borrowTokenAddress, signer));
        setCollateralToken(ERC20__factory.connect(collateralTokenAddress, signer));
      }

      setContractsSet(true);
    } catch (err) {
      console.error('VaultContext contract setup error:', err);
    }
  };

  const loadSymbols = async () => {
    if (!vaultLens || !borrowTokenLens || !collateralTokenLens) {
      console.error("contracts not set!");
      return;
    };

    try {
      const [vaultSymbol, borrowSymbol, collateralSymbol] = await Promise.all([
        vaultLens.symbol(),
        borrowTokenLens.symbol(),
        collateralTokenLens.symbol(),
      ]);

      setSharesSymbol(vaultSymbol);
      setBorrowTokenSymbol(borrowSymbol);
      setCollateralTokenSymbol(collateralSymbol);
    } catch (err) {
      console.error('Error loading token symbols:', err);
    }
  };

  useEffect(() => {
    setupContracts();
    if(contractsSet) {
      loadSymbols();
    }
  }, [publicProvider, signer, isConnected, contractsSet]);

  return (
    <VaultContext.Provider
      value={{
        sharesSymbol,
        borrowTokenSymbol,
        collateralTokenSymbol,
        vault,
        borrowToken,
        collateralToken,
        vaultLens,
        borrowTokenLens,
        collateralTokenLens,
        decimals,
        maxDeposit,
        maxRedeem,
        maxMint,
        maxWithdraw,
        maxDepositCollateral,
        maxRedeemCollateral,
        maxMintCollateral,
        maxWithdrawCollateral,
        updateMaxDeposit,
        updateMaxRedeem,
        updateMaxMint,
        updateMaxWithdraw,
        updateMaxDepositCollateral,
        updateMaxRedeemCollateral,
        updateMaxMintCollateral,
        updateMaxWithdrawCollateral
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVaultContext = () => {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVaultContext must be used within a VaultContextProvider');
  return context;
};