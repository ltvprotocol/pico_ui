import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits, formatEther, parseUnits, ZeroAddress } from 'ethers'
import { useAppContext } from '@/contexts/AppContext';
import { Vault, WETH, ERC20, Vault__factory, WETH__factory, ERC20__factory, LendingConnector__factory } from '@/typechain-types';
import { truncate, ltvToLeverage } from '@/utils';
import vaultsConfig from '../../vaults.config.json';
import { isWETHAddress, GAS_RESERVE_ETH } from '@/constants';
import { useAdaptiveInterval } from '@/hooks';

interface VaultConfig {
  address: string;
  collateralTokenAddress?: string;
  borrowTokenAddress?: string;
  sharesSymbol?: string;
  collateralTokenSymbol?: string;
  borrowTokenSymbol?: string;
  leverage?: string;
  targetLTV?: string;
  maxSafeLTV?: string;
  minProfitLTV?: string;
  lendingName?: string;
  lendingAddress?: string;
};

interface VaultContextType {
  vaultAddress: string;
  collateralTokenAddress: string;
  borrowTokenAddress: string;
  lendingAddress: string | null;
  lendingName: string | null;
  maxLeverage: string | null;
  sharesSymbol: string;
  borrowTokenSymbol: string | null;
  collateralTokenSymbol: string | null;
  vault: Vault | null;
  borrowToken: ERC20 | WETH | null;
  collateralToken: ERC20 | WETH | null;
  vaultLens: Vault | null;
  borrowTokenLens: ERC20 | WETH | null;
  collateralTokenLens: ERC20 | WETH | null;
  sharesDecimals: bigint;
  borrowTokenDecimals: bigint;
  collateralTokenDecimals: bigint;
  vaultConfig: VaultConfig | undefined;
  // Balances
  ethBalance: string;
  sharesBalance: string;
  borrowTokenBalance: string;
  collateralTokenBalance: string;
  // Vault limits
  vaultMaxDeposit: string;
  vaultMaxRedeem: string;
  vaultMaxMint: string;
  vaultMaxWithdraw: string;
  vaultMaxDepositCollateral: string;
  vaultMaxRedeemCollateral: string;
  vaultMaxMintCollateral: string;
  vaultMaxWithdrawCollateral: string;
  totalAssets: string;
  // User max values
  maxDeposit: string;
  maxRedeem: string;
  maxMint: string;
  maxWithdraw: string;
  maxDepositCollateral: string;
  maxRedeemCollateral: string;
  maxMintCollateral: string;
  maxWithdrawCollateral: string;
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultContextProvider = ({ children, vaultAddress, params }: { children: ReactNode, vaultAddress: string, params: { collateralTokenSymbol: string | null, borrowTokenSymbol: string | null, maxLeverage: string | null, lendingName: string | null } }) => {
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | undefined>(undefined);
  const [collateralTokenAddress, setCollateralTokenAddress] = useState<string>(ZeroAddress);
  const [borrowTokenAddress, setBorrowTokenAddress] = useState<string>(ZeroAddress);
  const [sharesSymbol, setSharesSymbol] = useState<string>('');
  const [lendingAddress, setLendingAddress] = useState<string | null>(null);
  const [lendingName, setLendingName] = useState<string | null>(null);
  const [maxLeverage, setMaxLeverage] = useState<string | null>(null);
  const [borrowTokenSymbol, setBorrowTokenSymbol] = useState<string | null>(null);
  const [collateralTokenSymbol, setCollateralTokenSymbol] = useState<string | null>(null);

  const [vault, setVault] = useState<Vault | null>(null);
  const [borrowToken, setBorrowToken] = useState<ERC20 | WETH | null>(null);
  const [collateralToken, setCollateralToken] = useState<ERC20 | WETH | null>(null);
  const [vaultLens, setVaultLens] = useState<Vault | null>(null);
  const [borrowTokenLens, setBorrowTokenLens] = useState<ERC20 | WETH | null>(null);
  const [collateralTokenLens, setCollateralTokenLens] = useState<ERC20 | WETH | null>(null);
  const [sharesDecimals, setSharesDecimals] = useState<bigint>(18n);
  const [borrowTokenDecimals, setBorrowTokenDecimals] = useState<bigint>(18n);
  const [collateralTokenDecimals, setCollateralTokenDecimals] = useState<bigint>(18n);

  const [ethBalance, setEthBalance] = useState<string>('0');
  const [sharesBalance, setSharesBalance] = useState<string>('0');
  const [borrowTokenBalance, setBorrowTokenBalance] = useState<string>('0');
  const [collateralTokenBalance, setCollateralTokenBalance] = useState<string>('0');

  const [vaultMaxDeposit, setVaultMaxDeposit] = useState<string>('0');
  const [vaultMaxRedeem, setVaultMaxRedeem] = useState<string>('0');
  const [vaultMaxMint, setVaultMaxMint] = useState<string>('0');
  const [vaultMaxWithdraw, setVaultMaxWithdraw] = useState<string>('0');
  const [vaultMaxDepositCollateral, setVaultMaxDepositCollateral] = useState<string>('0');
  const [vaultMaxRedeemCollateral, setVaultMaxRedeemCollateral] = useState<string>('0');
  const [vaultMaxMintCollateral, setVaultMaxMintCollateral] = useState<string>('0');
  const [vaultMaxWithdrawCollateral, setVaultMaxWithdrawCollateral] = useState<string>('0');
  const [totalAssets, setTotalAssets] = useState<string>('0');

  const [maxDeposit, setMaxDeposit] = useState<string>('0');
  const [maxRedeem, setMaxRedeem] = useState<string>('0');
  const [maxMint, setMaxMint] = useState<string>('0');
  const [maxWithdraw, setMaxWithdraw] = useState<string>('0');
  const [maxDepositCollateral, setMaxDepositCollateral] = useState<string>('0');
  const [maxRedeemCollateral, setMaxRedeemCollateral] = useState<string>('0');
  const [maxMintCollateral, setMaxMintCollateral] = useState<string>('0');
  const [maxWithdrawCollateral, setMaxWithdrawCollateral] = useState<string>('0');

  const { publicProvider, signer, isConnected, address } = useAppContext();

  const loadConfigAndParams = useCallback(() => {
    const chainId = "11155111";
    const vaults = vaultsConfig[chainId]?.vaults || [];
    const config = vaults.find(v => v.address.toLowerCase() === vaultAddress.toLowerCase());
    setVaultConfig(config);

    setCollateralTokenAddress(config?.collateralTokenAddress || ZeroAddress);
    setBorrowTokenAddress(config?.borrowTokenAddress || ZeroAddress);
    setSharesSymbol(config?.sharesSymbol || '');
    setLendingAddress((config as any)?.lendingAddress || null);
    setLendingName(params.lendingName ?? config?.lendingName ?? null);
    setMaxLeverage(params.maxLeverage ?? config?.leverage ?? null);
    setBorrowTokenSymbol(params.borrowTokenSymbol ?? config?.borrowTokenSymbol ?? null);
    setCollateralTokenSymbol(params.collateralTokenSymbol ?? config?.collateralTokenSymbol ?? null);
  }, [vaultAddress, params]);

  const initializeContracts = useCallback(async () => {
    if (!publicProvider) return;

    try {
      const vaultLensInstance = Vault__factory.connect(vaultAddress, publicProvider);
      setVaultLens(vaultLensInstance);

      const newCollateralTokenAddress = vaultConfig?.collateralTokenAddress || await vaultLensInstance.collateralToken();
      const newBorrowTokenAddress = vaultConfig?.borrowTokenAddress || await vaultLensInstance.borrowToken();

      setCollateralTokenAddress(newCollateralTokenAddress);
      setBorrowTokenAddress(newBorrowTokenAddress);

      const collateralContract = isWETHAddress(newCollateralTokenAddress)
        ? WETH__factory.connect(newCollateralTokenAddress, publicProvider)
        : ERC20__factory.connect(newCollateralTokenAddress, publicProvider);
      setCollateralTokenLens(collateralContract);

      const borrowContract = isWETHAddress(newBorrowTokenAddress)
        ? WETH__factory.connect(newBorrowTokenAddress, publicProvider)
        : ERC20__factory.connect(newBorrowTokenAddress, publicProvider);
      setBorrowTokenLens(borrowContract);

      const newDecimals = await vaultLensInstance.decimals();
      const newBorrowTokenDecimals = await vaultLensInstance.borrowTokenDecimals();
      const newCollateralTokenDecimals = await vaultLensInstance.collateralTokenDecimals();
      setSharesDecimals(newDecimals);
      setBorrowTokenDecimals(newBorrowTokenDecimals);
      setCollateralTokenDecimals(newCollateralTokenDecimals);

      if (signer) {
        setVault(Vault__factory.connect(vaultAddress, signer));
        setCollateralToken(isWETHAddress(newCollateralTokenAddress)
          ? WETH__factory.connect(newCollateralTokenAddress, signer)
          : ERC20__factory.connect(newCollateralTokenAddress, signer));
        setBorrowToken(isWETHAddress(newBorrowTokenAddress)
          ? WETH__factory.connect(newBorrowTokenAddress, signer)
          : ERC20__factory.connect(newBorrowTokenAddress, signer));
      }

      if (!vaultConfig?.sharesSymbol) {
        const symbol = await vaultLensInstance.symbol();
        setSharesSymbol(symbol);
      }

      if (!vaultConfig?.lendingAddress) {
        const lendingConnector = await vaultLensInstance.lendingConnector();
        const lending = LendingConnector__factory.connect(lendingConnector, publicProvider);
        const lendingProtocol = await lending.POOL();
        setLendingAddress(lendingProtocol);
      }

      if (!params.collateralTokenSymbol && !vaultConfig?.collateralTokenSymbol) {
        const symbol = await collateralContract.symbol();
        setCollateralTokenSymbol(symbol);
      }

      if (!params.borrowTokenSymbol && !vaultConfig?.borrowTokenSymbol) {
        const symbol = await borrowContract.symbol();
        setBorrowTokenSymbol(symbol);
      }

      if (!params.maxLeverage && !vaultConfig?.leverage) {
        const dividend = await vaultLensInstance.targetLtvDividend();
        const divider = await vaultLensInstance.targetLtvDivider();
        const rawLtv = (BigInt(dividend) * (10n ** 18n)) / BigInt(divider);
        const ltv = parseFloat(formatUnits(rawLtv, newDecimals)).toFixed(4);
        const leverage = ltvToLeverage(parseFloat(ltv));
        setMaxLeverage(leverage);
      }

      if (!params.lendingName && !vaultConfig?.lendingName) {
        setLendingName("Lending");
      }

    } catch (err) {
      console.error('VaultContext contract setup error:', err);
    }
  }, [publicProvider, signer, vaultAddress, vaultConfig, params]);

  const loadBalances = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens || !collateralTokenLens) return;

    try {
      const ethBalanceRaw = await publicProvider.getBalance(address);
      const currentEthBalance = parseFloat(formatEther(ethBalanceRaw));
      setEthBalance(truncate(currentEthBalance, 4));

      const [sharesBalanceRaw, borrowTokenBalanceRaw, collateralTokenBalanceRaw] = await Promise.all([
        vaultLens.balanceOf(address),
        borrowTokenLens.balanceOf(address),
        collateralTokenLens.balanceOf(address),
      ]);

      const currentSharesBalance = parseFloat(formatUnits(sharesBalanceRaw, sharesDecimals));
      const currentBorrowTokenBalance = parseFloat(formatUnits(borrowTokenBalanceRaw, borrowTokenDecimals));
      const currentCollateralTokenBalance = parseFloat(formatUnits(collateralTokenBalanceRaw, collateralTokenDecimals));

      setSharesBalance(truncate(currentSharesBalance, 4));
      setBorrowTokenBalance(truncate(currentBorrowTokenBalance, 4));
      setCollateralTokenBalance(truncate(currentCollateralTokenBalance, 4));

    } catch (err) {
      console.error('Error loading balances:', err);
    }
  }, [publicProvider, address, vaultLens, borrowTokenLens, collateralTokenLens, sharesDecimals, borrowTokenDecimals, collateralTokenDecimals]);

  const loadVaultLimits = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens) return;

    try {
      const [
        rawVaultMaxDeposit, rawVaultMaxRedeem, rawVaultMaxMint, rawVaultMaxWithdraw,
        rawVaultMaxDepositCollateral, rawVaultMaxRedeemCollateral, rawVaultMaxMintCollateral, rawVaultMaxWithdrawCollateral,
        rawTotalAssets
      ] = await Promise.all([
        vaultLens.maxDeposit(address),
        vaultLens.maxRedeem(address),
        vaultLens.maxMint(address),
        vaultLens.maxWithdraw(address),
        vaultLens.maxDepositCollateral(address),
        vaultLens.maxRedeemCollateral(address),
        vaultLens.maxMintCollateral(address),
        vaultLens.maxWithdrawCollateral(address),
        vaultLens["totalAssets()"]()
      ]);

      setVaultMaxDeposit(truncate(parseFloat(formatUnits(rawVaultMaxDeposit, borrowTokenDecimals)), 4));
      setVaultMaxRedeem(truncate(parseFloat(formatUnits(rawVaultMaxRedeem, sharesDecimals)), 4));
      setVaultMaxMint(truncate(parseFloat(formatUnits(rawVaultMaxMint, sharesDecimals)), 4));
      setVaultMaxWithdraw(truncate(parseFloat(formatUnits(rawVaultMaxWithdraw, borrowTokenDecimals)), 4));
      setVaultMaxDepositCollateral(truncate(parseFloat(formatUnits(rawVaultMaxDepositCollateral, collateralTokenDecimals)), 4));
      setVaultMaxRedeemCollateral(truncate(parseFloat(formatUnits(rawVaultMaxRedeemCollateral, sharesDecimals)), 4));
      setVaultMaxMintCollateral(truncate(parseFloat(formatUnits(rawVaultMaxMintCollateral, sharesDecimals)), 4));
      setVaultMaxWithdrawCollateral(truncate(parseFloat(formatUnits(rawVaultMaxWithdrawCollateral, collateralTokenDecimals)), 4));
      setTotalAssets(parseFloat(formatUnits(rawTotalAssets, borrowTokenDecimals)).toFixed(4));

    } catch (err) {
      console.error('Error loading vault limits:', err);
    }
  }, [publicProvider, address, vaultLens, sharesDecimals, borrowTokenDecimals, collateralTokenDecimals]);

  const calculateMaxValues = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens || !collateralTokenLens) return;

    try {
      const isBorrowTokenWeth = isWETHAddress(borrowTokenAddress);
      const isCollateralTokenWeth = isWETHAddress(collateralTokenAddress);

      const ethBalanceNum = parseFloat(ethBalance);
      const borrowTokenBalanceNum = parseFloat(borrowTokenBalance);
      const sharesBalanceNum = parseFloat(sharesBalance);
      const collateralTokenBalanceNum = parseFloat(collateralTokenBalance);

      // Calculate available ETH for WETH operations (subtract gas reserve)
      const availableEthForBorrow = isBorrowTokenWeth ? Math.max(0, ethBalanceNum - GAS_RESERVE_ETH) : 0;
      const availableEthForCollateral = isCollateralTokenWeth ? Math.max(0, ethBalanceNum - GAS_RESERVE_ETH) : 0;

      const vaultMaxDepositNum = parseFloat(vaultMaxDeposit);
      const vaultMaxRedeemNum = parseFloat(vaultMaxRedeem);
      const vaultMaxMintNum = parseFloat(vaultMaxMint);
      const vaultMaxWithdrawNum = parseFloat(vaultMaxWithdraw);
      const vaultMaxDepositCollateralNum = parseFloat(vaultMaxDepositCollateral);
      const vaultMaxRedeemCollateralNum = parseFloat(vaultMaxRedeemCollateral);
      const vaultMaxMintCollateralNum = parseFloat(vaultMaxMintCollateral);
      const vaultMaxWithdrawCollateralNum = parseFloat(vaultMaxWithdrawCollateral);

      const maxAvailableDeposit = Math.min(borrowTokenBalanceNum + availableEthForBorrow, vaultMaxDepositNum);
      const maxAvailableRedeem = Math.min(sharesBalanceNum, vaultMaxRedeemNum);
      const maxAvailableDepositCollateral = Math.min(collateralTokenBalanceNum + availableEthForCollateral, vaultMaxDepositCollateralNum);
      const maxAvailableRedeemCollateral = Math.min(sharesBalanceNum, vaultMaxRedeemCollateralNum);

      const borrowTokenBalanceRaw = parseUnits(borrowTokenBalanceNum.toString(), borrowTokenDecimals);
      const rawSharesForBorrowToken = await vaultLens.previewDeposit(borrowTokenBalanceRaw);
      const sharesForBorrowToken = parseFloat(formatUnits(rawSharesForBorrowToken, sharesDecimals));
      
      // Calculate shares for available ETH (with gas reserve subtracted)
      const availableEthForBorrowRaw = isBorrowTokenWeth ? parseUnits(availableEthForBorrow.toString(), 18) : 0n;
      const rawSharesForEth = isBorrowTokenWeth ? await vaultLens.previewDeposit(availableEthForBorrowRaw) : 0n;
      const sharesForEth = parseFloat(formatUnits(rawSharesForEth, sharesDecimals));
      const maxAvailableMint = Math.min(sharesForBorrowToken + sharesForEth, vaultMaxMintNum);

      const collateralTokenBalanceRaw = parseUnits(collateralTokenBalanceNum.toString(), collateralTokenDecimals);
      const rawSharesForCollateral = await vaultLens.previewDepositCollateral(collateralTokenBalanceRaw);
      const sharesForCollateral = parseFloat(formatUnits(rawSharesForCollateral, sharesDecimals));
      
      // Calculate shares for available ETH (with gas reserve subtracted)
      const availableEthForCollateralRaw = isCollateralTokenWeth ? parseUnits(availableEthForCollateral.toString(), 18) : 0n;
      const rawSharesForEthCollateral = isCollateralTokenWeth ? await vaultLens.previewDepositCollateral(availableEthForCollateralRaw) : 0n;
      const sharesForEthCollateral = parseFloat(formatUnits(rawSharesForEthCollateral, sharesDecimals));
      const maxAvailableMintCollateral = Math.min(sharesForCollateral + sharesForEthCollateral, vaultMaxMintCollateralNum);

      const sharesBalanceRaw = parseUnits(sharesBalanceNum.toString(), sharesDecimals);
      const rawPreviewedRedeem = await vaultLens.previewRedeem(sharesBalanceRaw);
      const previewedRedeem = parseFloat(formatUnits(rawPreviewedRedeem, sharesDecimals));
      const maxAvailableWithdrawTokens = Math.min(previewedRedeem, vaultMaxWithdrawNum);

      const rawPreviewedRedeemCollateral = await vaultLens.previewRedeemCollateral(sharesBalanceRaw);
      const previewedRedeemCollateral = parseFloat(formatUnits(rawPreviewedRedeemCollateral, sharesDecimals));
      const maxAvailableWithdrawCollateralTokens = Math.min(previewedRedeemCollateral, vaultMaxWithdrawCollateralNum);

      setMaxDeposit(truncate(maxAvailableDeposit, 4));
      setMaxRedeem(truncate(maxAvailableRedeem, 4));
      setMaxMint(truncate(maxAvailableMint, 4));
      setMaxWithdraw(truncate(maxAvailableWithdrawTokens, 4));
      setMaxDepositCollateral(truncate(maxAvailableDepositCollateral, 4));
      setMaxRedeemCollateral(truncate(maxAvailableRedeemCollateral, 4));
      setMaxMintCollateral(truncate(maxAvailableMintCollateral, 4));
      setMaxWithdrawCollateral(truncate(maxAvailableWithdrawCollateralTokens, 4));

    } catch (err) {
      console.error('Error calculating max values:', err);
    }
  }, [publicProvider, address, vaultLens, borrowTokenLens, collateralTokenLens, sharesDecimals, borrowTokenDecimals, collateralTokenDecimals, 
      ethBalance, borrowTokenBalance, sharesBalance, collateralTokenBalance, 
      borrowTokenAddress, collateralTokenAddress, vaultMaxDeposit, vaultMaxRedeem, 
      vaultMaxMint, vaultMaxWithdraw, vaultMaxDepositCollateral, vaultMaxRedeemCollateral, 
      vaultMaxMintCollateral, vaultMaxWithdrawCollateral]);

  // Load all possbile from config and params
  useEffect(() => {
    loadConfigAndParams();
  }, [loadConfigAndParams]);

  // Initialize contracts
  useEffect(() => {
    if (vaultConfig) {
      initializeContracts();
    }
  }, [vaultConfig, initializeContracts]);

  // Load balances
  useEffect(() => {
    if (vaultLens && borrowTokenLens && collateralTokenLens) {
      loadBalances();
    }
  }, [vaultLens, borrowTokenLens, collateralTokenLens, loadBalances]);

  // Load vault limits
  useEffect(() => {
    if (vaultLens) {
      loadVaultLimits();
    }
  }, [vaultLens, loadVaultLimits]);

  // Calculate max values for user based on balances and vault limits
  useEffect(() => {
    if (ethBalance !== '0' || sharesBalance !== '0' || borrowTokenBalance !== '0' || collateralTokenBalance !== '0') {
      if (vaultMaxDeposit !== '0' || vaultMaxRedeem !== '0' || vaultMaxMint !== '0' || vaultMaxWithdraw !== '0' ||
          vaultMaxDepositCollateral !== '0' || vaultMaxRedeemCollateral !== '0' || vaultMaxMintCollateral !== '0' || vaultMaxWithdrawCollateral !== '0') {
        calculateMaxValues();
      }
    }
  }, [ethBalance, sharesBalance, borrowTokenBalance, collateralTokenBalance, 
      vaultMaxDeposit, vaultMaxRedeem, vaultMaxMint, vaultMaxWithdraw, 
      vaultMaxDepositCollateral, vaultMaxRedeemCollateral, vaultMaxMintCollateral, vaultMaxWithdrawCollateral, calculateMaxValues]);

  // Refetch balances every 12 seconds
  useAdaptiveInterval(loadBalances, {
    initialDelay: 12000,
    maxDelay: 60000,
    multiplier: 2,
    enabled: isConnected && !!vaultLens && !!borrowTokenLens && !!collateralTokenLens
  });

  // Refetch vault limits every 12 seconds
  useAdaptiveInterval(loadVaultLimits, {
    initialDelay: 12000,
    maxDelay: 60000,
    multiplier: 2,
    enabled: isConnected && !!vaultLens
  });

  return (
    <VaultContext.Provider
      value={{
        vaultAddress,
        collateralTokenAddress, 
        borrowTokenAddress,
        lendingAddress,
        lendingName,
        maxLeverage,
        sharesSymbol,
        borrowTokenSymbol,
        collateralTokenSymbol,
        vault,
        borrowToken,
        collateralToken,
        vaultLens,
        borrowTokenLens,
        collateralTokenLens,
        sharesDecimals,
        borrowTokenDecimals,
        collateralTokenDecimals,
        vaultConfig,
        ethBalance,
        sharesBalance,
        borrowTokenBalance,
        collateralTokenBalance,
        vaultMaxDeposit,
        vaultMaxRedeem,
        vaultMaxMint,
        vaultMaxWithdraw,
        vaultMaxDepositCollateral,
        vaultMaxRedeemCollateral,
        vaultMaxMintCollateral,
        vaultMaxWithdrawCollateral,
        totalAssets,
        maxDeposit,
        maxRedeem,
        maxMint,
        maxWithdraw,
        maxDepositCollateral,
        maxRedeemCollateral,
        maxMintCollateral,
        maxWithdrawCollateral
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