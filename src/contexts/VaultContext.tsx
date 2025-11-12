import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits, formatEther, parseUnits, ZeroAddress, parseEther } from 'ethers'
import { useAppContext } from '@/contexts/AppContext';
import {
  Vault, Vault__factory,
  WETH, WETH__factory,
  ERC20, ERC20__factory,
  FlashLoanMintHelper, FlashLoanMintHelper__factory,
  FlashLoanRedeemHelper, FlashLoanRedeemHelper__factory,
  WhitelistRegistry__factory
} from '@/typechain-types';
import { ltvToLeverage, getLendingProtocolAddress, isVaultExists, isUserRejected, fetchApy, fetchPointsRate } from '@/utils';
import vaultsConfig from '../../vaults.config.json';
import signaturesConfig from '../../signatures.config.json';
import { isWETHAddress, GAS_RESERVE_WEI, SEPOLIA_CHAIN_ID_STRING, MORPHO_MARKET_ID, CONNECTOR_ADDRESSES} from '@/constants';
import { useAdaptiveInterval } from '@/hooks';
import { loadGhostLtv, loadAaveLtv, loadMorphoLtv } from '@/utils';

interface Signature {
  v: number;
  r: string;
  s: string;
}

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
  description?: string;
  flashLoanMintHelperAddress?: string;
  flashLoanRedeemHelperAddress?: string;
  useSafeActions?: boolean;
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
  description: string | null;
  // Flash loan helpers
  flashLoanMintHelper: FlashLoanMintHelper | null;
  flashLoanRedeemHelper: FlashLoanRedeemHelper | null;
  flashLoanMintHelperAddress: string | null;
  flashLoanRedeemHelperAddress: string | null;
  // Vault existence
  vaultExists: boolean | null;
  isCheckingVaultExistence: boolean;
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
  // Whitelist
  isWhitelistActivated: boolean | null;
  isWhitelisted: boolean | null;
  hasSignature: boolean;
  signature: Signature | null;
  isCheckingWhitelist: boolean;
  activateWhitelist: () => Promise<void>;
  isActivatingWhitelist: boolean;
  whitelistError: string | null;
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
  pointsRate: number | null,
  isWhitelistActivated: boolean | null,
  isWhitelisted: boolean | null,
  hasSignature: boolean | undefined
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
  const [description, setDescription] = useState<string | null>(null);

  // Vault existence state
  const [vaultExists, setVaultExists] = useState<boolean | null>(null);
  const [isCheckingVaultExistence, setIsCheckingVaultExistence] = useState<boolean>(true);

  const [vault, setVault] = useState<Vault | null>(null);
  const [borrowToken, setBorrowToken] = useState<ERC20 | WETH | null>(null);
  const [collateralToken, setCollateralToken] = useState<ERC20 | WETH | null>(null);
  const [vaultLens, setVaultLens] = useState<Vault | null>(null);
  const [borrowTokenLens, setBorrowTokenLens] = useState<ERC20 | WETH | null>(null);
  const [collateralTokenLens, setCollateralTokenLens] = useState<ERC20 | WETH | null>(null);
  const [sharesDecimals, setSharesDecimals] = useState<bigint>(18n);
  const [borrowTokenDecimals, setBorrowTokenDecimals] = useState<bigint>(18n);
  const [collateralTokenDecimals, setCollateralTokenDecimals] = useState<bigint>(18n);

  const [flashLoanMintHelper, setFlashLoanMintHelper] = useState<FlashLoanMintHelper | null>(null);
  const [flashLoanRedeemHelper, setFlashLoanRedeemHelper] = useState<FlashLoanRedeemHelper | null>(null);
  const [flashLoanMintHelperAddress, setFlashLoanMintHelperAddress] = useState<string | null>(null);
  const [flashLoanRedeemHelperAddress, setFlashLoanRedeemHelperAddress] = useState<string | null>(null);

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

  // Whitelist state
  const [isWhitelistActivated, setIsWhitelistActivated] = useState<boolean | null>(params.isWhitelistActivated ?? null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [isCheckingWhitelist, setIsCheckingWhitelist] = useState<boolean>(false);
  const [isActivatingWhitelist, setIsActivatingWhitelist] = useState<boolean>(false);
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [lastCheckedAddressForSignature, setLastCheckedAddressForSignature] = useState<string | null>(null);
  const [hasUsedInitialWhitelistParams, setHasUsedInitialWhitelistParams] = useState<boolean>(false);

  const { publicProvider, signer, isConnected, address, currentNetwork } = useAppContext();

  const checkVaultExistence = useCallback(async () => {
    if (!vaultAddress || !publicProvider) {
      setIsCheckingVaultExistence(false);
      return;
    }

    try {
      setIsCheckingVaultExistence(true);
      const exists = await isVaultExists(vaultAddress, publicProvider);
      setVaultExists(exists);
    } catch (err) {
      console.error('Error checking vault existence:', err);
      setVaultExists(false);
    } finally {
      setIsCheckingVaultExistence(false);
    }
  }, [vaultAddress, publicProvider]);

  const loadConfigAndParams = useCallback(() => {
    const chainId = currentNetwork || SEPOLIA_CHAIN_ID_STRING; // Use current network or default to Sepolia
    const vaults = (vaultsConfig as any)[chainId]?.vaults || [];
    const config = vaults.find((v: any) => v.address.toLowerCase() === vaultAddress.toLowerCase());
    setVaultConfig(config);

    setCollateralTokenAddress(config?.collateralTokenAddress || ZeroAddress);
    setBorrowTokenAddress(config?.borrowTokenAddress || ZeroAddress);
    setSharesSymbol(config?.sharesSymbol || '');
    setLendingAddress((config as any)?.lendingAddress || null);
    setLendingName(params.lendingName ?? config?.lendingName ?? null);
    setMaxLeverage(params.maxLeverage ?? config?.leverage ?? null);
    setBorrowTokenSymbol(params.borrowTokenSymbol ?? config?.borrowTokenSymbol ?? null);
    setCollateralTokenSymbol(params.collateralTokenSymbol ?? config?.collateralTokenSymbol ?? null);
    setDescription(config?.description ?? null);
    
    if (params.apy !== null) {
      setApy(params.apy);
      setApyLoadFailed(false);
    }
    if (params.pointsRate !== null) {
      setPointsRate(params.pointsRate);
      setPointsRateLoadFailed(false);
    }
  }, [vaultAddress, params, currentNetwork]);

  const loadApyData = useCallback(async () => {
    if (params.apy !== null && params.pointsRate !== null) {
      return;
    }

    try {
      const [apyResult, pointsRateResult] = await Promise.all([
        params.apy === null ? fetchApy(vaultAddress, currentNetwork) : Promise.resolve(params.apy),
        params.pointsRate === null ? fetchPointsRate(vaultAddress, currentNetwork) : Promise.resolve(params.pointsRate)
      ]);

      if (params.apy === null) {
        setApy(apyResult);
        setApyLoadFailed(apyResult === null);
      }
      if (params.pointsRate === null) {
        setPointsRate(pointsRateResult);
        setPointsRateLoadFailed(pointsRateResult === null);
      }
    } catch (err) {
      console.error('Error loading APY data:', err);
      if (params.apy === null) {
        setApyLoadFailed(true);
      }
      if (params.pointsRate === null) {
        setPointsRateLoadFailed(true);
      }
    }
  }, [vaultAddress, currentNetwork, params.apy, params.pointsRate]);

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

        // Initialize flash loan helpers if addresses are configured
        if (vaultConfig?.flashLoanMintHelperAddress && vaultConfig.flashLoanMintHelperAddress !== '') {
          setFlashLoanMintHelper(FlashLoanMintHelper__factory.connect(vaultConfig.flashLoanMintHelperAddress, signer));
          setFlashLoanMintHelperAddress(vaultConfig.flashLoanMintHelperAddress);
        } else {
          setFlashLoanMintHelper(null);
          setFlashLoanMintHelperAddress(null);
        }

        if (vaultConfig?.flashLoanRedeemHelperAddress && vaultConfig.flashLoanRedeemHelperAddress !== '') {
          setFlashLoanRedeemHelper(FlashLoanRedeemHelper__factory.connect(vaultConfig.flashLoanRedeemHelperAddress, signer));
          setFlashLoanRedeemHelperAddress(vaultConfig.flashLoanRedeemHelperAddress);
        } else {
          setFlashLoanRedeemHelper(null);
          setFlashLoanRedeemHelperAddress(null);
        }
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
  
  // Check whitelist activation status
  const checkWhitelistActivation = useCallback(async () => {
    if (!vaultLens || params.isWhitelistActivated !== null) {
      return;
    }

    try {
      const activated = await vaultLens.isWhitelistActivated();
      setIsWhitelistActivated(activated);
    } catch (err) {
      console.error('Error checking whitelist activation:', err);
      setIsWhitelistActivated(null);
    }
  }, [vaultLens, params.isWhitelistActivated]);

  // Check if user has signature and load signature data
  useEffect(() => {
    if (!address || !currentNetwork || !vaultAddress) {
      setHasSignature(false);
      setSignature(null);
      setLastCheckedAddressForSignature(null);
      return;
    }

    // If we have params and haven't checked any address yet, use params
    if (!lastCheckedAddressForSignature && params.hasSignature !== undefined) {
      setHasSignature(params.hasSignature);
      setLastCheckedAddressForSignature(address);
      
      // If params say user has signature, load the signature data
      if (params.hasSignature) {
        const networkSignatures = (signaturesConfig as any)[currentNetwork];
        const vaultSignatures = networkSignatures?.vaults?.[vaultAddress.toLowerCase()];
        const signaturesMap = vaultSignatures?.signatures;
        const addressLower = address.toLowerCase();
        const signatureData = signaturesMap?.[addressLower];
        
        if (signatureData) {
          setSignature({
            v: signatureData.v,
            r: signatureData.r,
            s: signatureData.s
          });
        }
      }
      return;
    }

    // If address changed or no params were provided, check signature
    if (address !== lastCheckedAddressForSignature) {
      const networkSignatures = (signaturesConfig as any)[currentNetwork];
      const vaultSignatures = networkSignatures?.vaults?.[vaultAddress.toLowerCase()];
      const signaturesMap = vaultSignatures?.signatures;

      if (!signaturesMap) {
        setHasSignature(false);
        setSignature(null);
        setLastCheckedAddressForSignature(address);
        return;
      }

      const addressLower = address.toLowerCase();
      const signatureData = signaturesMap[addressLower];
      
      if (signatureData) {
        setHasSignature(true);
        setSignature({
          v: signatureData.v,
          r: signatureData.r,
          s: signatureData.s
        });
      } else {
        setHasSignature(false);
        setSignature(null);
      }
      
      setLastCheckedAddressForSignature(address);
    }
  }, [address, currentNetwork, vaultAddress, params.hasSignature, lastCheckedAddressForSignature]);

  // Use initial params only once, then always check
  useEffect(() => {
    if (!hasUsedInitialWhitelistParams && params.isWhitelisted !== null && isWhitelistActivated !== null) {
      if (isWhitelistActivated) {
        setIsWhitelisted(params.isWhitelisted);
      }
      setHasUsedInitialWhitelistParams(true);
    }
  }, [params.isWhitelisted, hasUsedInitialWhitelistParams, isWhitelistActivated]);

  // Check if user is whitelisted - always check from registry, don't rely on params after initial load
  const checkWhitelistStatus = useCallback(async () => {
    if (!vaultLens || !address || !isConnected || isWhitelistActivated === null) {
      setIsWhitelisted(null);
      return;
    }

    // If whitelist is not activated, everyone is whitelisted
    if (!isWhitelistActivated) {
      setIsWhitelisted(true);
      setIsCheckingWhitelist(false);
      return;
    }

    setIsCheckingWhitelist(true);
    try {
      const whitelistRegistryAddress = await vaultLens.whitelistRegistry();
      if (whitelistRegistryAddress === ZeroAddress) {
        setIsWhitelisted(null);
        return;
      }

      const whitelistRegistry = WhitelistRegistry__factory.connect(whitelistRegistryAddress, publicProvider!);
      const whitelisted = await whitelistRegistry.isAddressWhitelisted(address);
      setIsWhitelisted(whitelisted);
    } catch (err) {
      console.error('Error checking whitelist status:', err);
      setIsWhitelisted(null);
    } finally {
      setIsCheckingWhitelist(false);
    }
  }, [vaultLens, address, isConnected, isWhitelistActivated, publicProvider]);

  const activateWhitelist = useCallback(async () => {
    if (!vaultLens || !signer || !address || !signature || !isWhitelistActivated) {
      console.error('Missing required data for whitelist activation');
      return;
    }

    setIsActivatingWhitelist(true);
    setWhitelistError(null);

    try {
      const whitelistRegistryAddress = await vaultLens.whitelistRegistry();
      if (whitelistRegistryAddress === ZeroAddress) {
        setWhitelistError('Whitelist registry not found');
        return;
      }

      const whitelistRegistry = WhitelistRegistry__factory.connect(whitelistRegistryAddress, signer);

      const tx = await whitelistRegistry.addAddressToWhitelistBySignature(
        address,
        signature.v,
        signature.r,
        signature.s
      );

      console.log('Whitelist activation transaction submitted:', tx.hash);
      await tx.wait();
      console.log('Whitelist activation transaction confirmed');

      await checkWhitelistStatus();
      
    } catch (err: any) {
      console.error('Error activating whitelist:', err);
      
      if (isUserRejected(err)) {
        setWhitelistError('Transaction rejected by user');
      } else if (err.message?.includes('AddressWhitelistingBySignatureDisabled')) {
        setWhitelistError('This address has already used its whitelist signature');
      } else if (err.message?.includes('InvalidSignature')) {
        setWhitelistError('Invalid signature provided');
      } else {
        setWhitelistError('Failed to activate whitelist. Please try again.');
      }
    } finally {
      setIsActivatingWhitelist(false);
    }
  }, [vaultLens, signer, address, signature, isWhitelistActivated, checkWhitelistStatus]);

  useEffect(() => {
    if (vaultLens) {
      checkWhitelistActivation();
    }
  }, [address, currentNetwork, vaultLens, checkWhitelistActivation]);

  useEffect(() => {
    checkWhitelistStatus();
  }, [address, currentNetwork, checkWhitelistStatus]);

  // Load ltv
  useEffect(() => {
    if (vaultLens && borrowTokenDecimals && lendingAddress) {
      loadLtv();
    }
  }, [vaultLens, borrowTokenDecimals, lendingAddress, loadLtv]);

  // Check vault existence
  useEffect(() => {
    checkVaultExistence();
  }, [checkVaultExistence]);

  // Load all possbile from config and params
  useEffect(() => {
    loadConfigAndParams();
  }, [loadConfigAndParams]);

  // Load APY data from API if not provided in params
  useEffect(() => {
    loadApyData();
  }, [loadApyData]);

  // Initialize contracts
  useEffect(() => {
    if (vaultConfig && publicProvider) {
      initializeContracts();
    }
  }, [vaultConfig, publicProvider, initializeContracts]);

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
        description,
        flashLoanMintHelper,
        flashLoanRedeemHelper,
        flashLoanMintHelperAddress,
        flashLoanRedeemHelperAddress,
        vaultExists,
        isCheckingVaultExistence,
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
        isWhitelistActivated,
        isWhitelisted,
        hasSignature,
        signature,
        isCheckingWhitelist,
        activateWhitelist,
        isActivatingWhitelist,
        whitelistError,
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
