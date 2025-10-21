import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits, formatEther, parseUnits, ZeroAddress, parseEther } from 'ethers'
import { useAppContext } from '@/contexts/AppContext';
import { Vault, WETH, ERC20, Vault__factory, WETH__factory, ERC20__factory } from '@/typechain-types';
import { ltvToLeverage, getLendingProtocolAddress } from '@/utils';
import vaultsConfig from '../../vaults.config.json';
import { isWETHAddress, GAS_RESERVE_WEI, SEPOLIA_CHAIN_ID_STRING, MORPHO_MARKET_ID, CONNECTOR_ADDRESSES} from '@/constants';
import { useAdaptiveInterval } from '@/hooks';
import { loadGhostLtv, loadAaveLtv, loadMorphoLtv } from '@/utils';

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
  dexLink?: string;
  dexLinkName?: string;
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
  apy: number | null;
  pointsRate: number | null;
  apyLoadFailed: boolean;
  pointsRateLoadFailed: boolean;
  currentLtv: string | null;
  // Refresh functions
  refreshBalances: () => Promise<void>;
  refreshVaultLimits: () => Promise<void>;
};

interface Params {
  collateralTokenSymbol: string | null,
  borrowTokenSymbol: string | null,
  maxLeverage: string | null,
  lendingName: string | null,
  apy: number | null,
  pointsRate: number | null
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultContextProvider = ({ children, vaultAddress, params }: { children: ReactNode, vaultAddress: string, params: Params }) => {
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

  const [apy, setApy] = useState<number | null>(null);
  const [pointsRate, setPointsRate] = useState<number | null>(null);
  const [apyLoadFailed, setApyLoadFailed] = useState<boolean>(false);
  const [pointsRateLoadFailed, setPointsRateLoadFailed] = useState<boolean>(false);

  const [currentLtv, setCurrentLtv] = useState<string | null>(null);

  const { publicProvider, signer, isConnected, address } = useAppContext();

  const loadConfigAndParams = useCallback(() => {
    const chainId = SEPOLIA_CHAIN_ID_STRING; // Forcing Sepolia for now. In future - get from AppContext
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
    setApy(params.apy);
    setPointsRate(params.pointsRate);
    setApyLoadFailed(params.apy === null);
    setPointsRateLoadFailed(params.pointsRate === null);
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
        const lendingProtocol = await getLendingProtocolAddress(lendingConnector, publicProvider);
        if (lendingProtocol) {
          setLendingAddress(lendingProtocol);
        }
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
        const ltv = Number(dividend) / Number(divider);
        const leverage = ltvToLeverage(ltv);
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
      setEthBalance(formatEther(ethBalanceRaw));

      const [sharesBalanceRaw, borrowTokenBalanceRaw, collateralTokenBalanceRaw] = await Promise.all([
        vaultLens.balanceOf(address),
        borrowTokenLens.balanceOf(address),
        collateralTokenLens.balanceOf(address),
      ]);

      setSharesBalance(formatUnits(sharesBalanceRaw, sharesDecimals));
      setBorrowTokenBalance(formatUnits(borrowTokenBalanceRaw, borrowTokenDecimals));
      setCollateralTokenBalance(formatUnits(collateralTokenBalanceRaw, collateralTokenDecimals));

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

      setVaultMaxDeposit(formatUnits(rawVaultMaxDeposit, borrowTokenDecimals));
      setVaultMaxRedeem(formatUnits(rawVaultMaxRedeem, sharesDecimals));
      setVaultMaxMint(formatUnits(rawVaultMaxMint, sharesDecimals));
      setVaultMaxWithdraw(formatUnits(rawVaultMaxWithdraw, borrowTokenDecimals));
      setVaultMaxDepositCollateral(formatUnits(rawVaultMaxDepositCollateral, collateralTokenDecimals));
      setVaultMaxRedeemCollateral(formatUnits(rawVaultMaxRedeemCollateral, sharesDecimals));
      setVaultMaxMintCollateral(formatUnits(rawVaultMaxMintCollateral, sharesDecimals));
      setVaultMaxWithdrawCollateral(formatUnits(rawVaultMaxWithdrawCollateral, collateralTokenDecimals));
      setTotalAssets(formatUnits(rawTotalAssets, borrowTokenDecimals));

    } catch (err) {
      console.error('Error loading vault limits:', err);
    }
  }, [publicProvider, address, vaultLens, sharesDecimals, borrowTokenDecimals, collateralTokenDecimals]);

  const calculateMaxValues = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens || !collateralTokenLens) return;

    try {
      const isBorrowTokenWeth = isWETHAddress(borrowTokenAddress);
      const isCollateralTokenWeth = isWETHAddress(collateralTokenAddress);

      const dShares = Number(sharesDecimals);
      const dBorrow = Number(borrowTokenDecimals);
      const dColl = Number(collateralTokenDecimals);

      const ethBalanceWei = parseEther(ethBalance);
      const borrowTokenBalanceWei = parseUnits(borrowTokenBalance, dBorrow);
      const sharesBalanceWei = parseUnits(sharesBalance, dShares);
      const collateralTokenBalanceWei = parseUnits(collateralTokenBalance, dColl);

      const vaultMaxDepositWei = parseUnits(vaultMaxDeposit, dBorrow);
      const vaultMaxRedeemWei = parseUnits(vaultMaxRedeem, dShares);
      const vaultMaxMintWei = parseUnits(vaultMaxMint, dShares);
      const vaultMaxWithdrawWei = parseUnits(vaultMaxWithdraw, dBorrow);
      const vaultMaxDepositCollateralWei = parseUnits(vaultMaxDepositCollateral, dColl);
      const vaultMaxRedeemCollateralWei = parseUnits(vaultMaxRedeemCollateral, dShares);
      const vaultMaxMintCollateralWei = parseUnits(vaultMaxMintCollateral, dShares);
      const vaultMaxWithdrawCollateralWei = parseUnits(vaultMaxWithdrawCollateral, dColl);

      const max0n = (x: bigint) => (x > 0n ? x : 0n);
      const minBN = (a: bigint, b: bigint) => (a < b ? a : b);

      const availableEthForBorrowWei =
        isBorrowTokenWeth ? max0n(ethBalanceWei - GAS_RESERVE_WEI) : 0n;
      const availableEthForCollateralWei =
        isCollateralTokenWeth ? max0n(ethBalanceWei - GAS_RESERVE_WEI) : 0n;

      // ---- DEPOSIT (borrow side) ----
      const depositBudgetWei = isBorrowTokenWeth
        ? borrowTokenBalanceWei + availableEthForBorrowWei
        : borrowTokenBalanceWei;

      const maxAvailableDepositWei = minBN(depositBudgetWei, vaultMaxDepositWei);
      const maxAvailableDeposit = formatUnits(maxAvailableDepositWei, dBorrow);

      // ---- REDEEM (shares) ----
      const maxAvailableRedeemWei = minBN(sharesBalanceWei, vaultMaxRedeemWei);
      const maxAvailableRedeem = formatUnits(maxAvailableRedeemWei, dShares);

      // ---- MINT ----
      const rawSharesForBorrowToken = await vaultLens.previewDeposit(borrowTokenBalanceWei);
      const rawSharesForEth = isBorrowTokenWeth
        ? await vaultLens.previewDeposit(availableEthForBorrowWei)
        : 0n;

      const mintBudgetSharesWei = rawSharesForBorrowToken + rawSharesForEth;
      const maxAvailableMintWei = minBN(mintBudgetSharesWei, vaultMaxMintWei);
      const maxAvailableMint = formatUnits(maxAvailableMintWei, dShares);

      // ---- DEPOSIT COLLATERAL ----
      const depositCollateralBudgetWei = isCollateralTokenWeth
        ? collateralTokenBalanceWei + availableEthForCollateralWei
        : collateralTokenBalanceWei;

      const maxAvailableDepositCollateralWei = minBN(
        depositCollateralBudgetWei,
        vaultMaxDepositCollateralWei
      );
      const maxAvailableDepositCollateral = formatUnits(maxAvailableDepositCollateralWei, dColl);

      // ---- REDEEM (shares) ----
      const maxAvailableRedeemCollateralWei = minBN(
        sharesBalanceWei,
        vaultMaxRedeemCollateralWei
      );
      const maxAvailableRedeemCollateral = formatUnits(maxAvailableRedeemCollateralWei, dShares);

      // ---- MINT COLLATERAL (shares) ----
      const rawSharesForCollateral = await vaultLens.previewDepositCollateral(collateralTokenBalanceWei);
      const rawSharesForEthCollateral = isCollateralTokenWeth
        ? await vaultLens.previewDepositCollateral(availableEthForCollateralWei)
        : 0n;

      const mintCollateralBudgetSharesWei = rawSharesForCollateral + rawSharesForEthCollateral;
      const maxAvailableMintCollateralWei = minBN(
        mintCollateralBudgetSharesWei,
        vaultMaxMintCollateralWei
      );
      const maxAvailableMintCollateral = formatUnits(maxAvailableMintCollateralWei, dShares);

      // ---- WITHDRAW (borrow/collateral) ----
      const maxAvailableWithdrawTokens = formatUnits(vaultMaxWithdrawWei, dBorrow);
      const maxAvailableWithdrawCollateralTokens = formatUnits(vaultMaxWithdrawCollateralWei, dColl);

      setMaxDeposit(maxAvailableDeposit);
      setMaxRedeem(maxAvailableRedeem);
      setMaxMint(maxAvailableMint);
      setMaxWithdraw(maxAvailableWithdrawTokens);
      setMaxDepositCollateral(maxAvailableDepositCollateral);
      setMaxRedeemCollateral(maxAvailableRedeemCollateral);
      setMaxMintCollateral(maxAvailableMintCollateral);
      setMaxWithdrawCollateral(maxAvailableWithdrawCollateralTokens);

    } catch (err) {
      console.error('Error calculating max values:', err);
    }
  }, [
    publicProvider, address, vaultLens, borrowTokenLens, collateralTokenLens,
    sharesDecimals, borrowTokenDecimals, collateralTokenDecimals,
    ethBalance, borrowTokenBalance, sharesBalance, collateralTokenBalance,
    borrowTokenAddress, collateralTokenAddress,
    vaultMaxDeposit, vaultMaxRedeem, vaultMaxMint, vaultMaxWithdraw,
    vaultMaxDepositCollateral, vaultMaxRedeemCollateral,
    vaultMaxMintCollateral, vaultMaxWithdrawCollateral
  ]);

  const loadLtv = useCallback(async () => {
    if (!publicProvider || !vaultLens || !vaultAddress || !lendingAddress) return;

    try {
      const lendingConnectorAddress = await vaultLens.lendingConnector();

      if (lendingConnectorAddress.toLowerCase() === CONNECTOR_ADDRESSES.AAVE.toLowerCase()) {
        const aaveLtv = await loadAaveLtv(lendingAddress, vaultAddress, publicProvider);
        if (aaveLtv) {
          setCurrentLtv(aaveLtv);
          return;
        }
      } else if (lendingConnectorAddress.toLowerCase() === CONNECTOR_ADDRESSES.GHOST.toLowerCase()) {
        const ghostLtv = await loadGhostLtv(lendingAddress, vaultAddress, publicProvider);
        if (ghostLtv) {
          setCurrentLtv(ghostLtv);
          return;
        }
      } else if (lendingConnectorAddress.toLowerCase() === CONNECTOR_ADDRESSES.MORPHO.toLowerCase()) {
        const morphoLtv = await loadMorphoLtv(
          lendingAddress,
          vaultAddress,
          MORPHO_MARKET_ID,
          borrowTokenDecimals,
          publicProvider
        );
        if (morphoLtv) {
          setCurrentLtv(morphoLtv);
          return;
        }
      } else {
        console.log('Unknown lending connector:', lendingConnectorAddress, 'unable to fetch LTV');
        setCurrentLtv('UNKNOWN_CONNECTOR');
        return;
      }

      console.error('LTV loading failed for known connector');
      setCurrentLtv('LOAD_FAILED');
    } catch (err) {
      console.error('Error loading LTV:', err);
      setCurrentLtv('LOAD_FAILED');
    }
  }, [publicProvider, vaultLens, lendingAddress, vaultAddress, borrowTokenDecimals]);
  
  // Load ltv
  useEffect(() => {
    if (vaultLens && borrowTokenDecimals && lendingAddress) {
      loadLtv();
    }
  }, [vaultLens, borrowTokenDecimals, lendingAddress, loadLtv]);

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
        maxWithdrawCollateral,
        apy,
        pointsRate,
        apyLoadFailed,
        pointsRateLoadFailed,
        currentLtv,
        refreshBalances: loadBalances,
        refreshVaultLimits: loadVaultLimits
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