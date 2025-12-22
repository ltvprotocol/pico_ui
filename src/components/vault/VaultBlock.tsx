import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatUnits, ZeroAddress } from "ethers";
import { useAppContext } from "@/contexts";
import { formatTokenSymbol, formatApy, ltvToLeverage } from "@/utils";
import { useAdaptiveInterval, useVaultApy, useVaultPointsRate } from "@/hooks";
import { Vault__factory, ERC20__factory, WhitelistRegistry__factory } from "@/typechain-types";
import { NumberDisplay, TransitionLoader } from "@/components/ui";
import vaultsConfig from "../../../vaults.config.json";
import signaturesConfig from "../../../signatures.config.json";

interface VaultBlockProps {
  address: string;
}

interface StaticVaultData {
  borrowTokenSymbol: string | null;
  collateralTokenSymbol: string | null;
  maxLeverage: string | null;
  lendingName: string | null;
  isWhitelistActivated: boolean | null;
}

interface WhitelistData {
  isWhitelisted: boolean | null;
  hasSignature: boolean;
}

interface DynamicVaultData {
  deposits: bigint | null;
}

interface VaultDecimals {
  sharesDecimals: bigint;
  borrowTokenDecimals: bigint;
  collateralTokenDecimals: bigint;
}

interface LoadingState {
  isLoadingTokens: boolean;
  isLoadingAssets: boolean;
  isLoadingLeverage: boolean;
  isLoadingDecimals: boolean;
  hasLoadedTokens: boolean;
  hasLoadedAssets: boolean;
  hasLoadedLeverage: boolean;
  hasLoadedDecimals: boolean;
}

export default function VaultBlock({ address }: VaultBlockProps) {
  const [staticData, setStaticData] = useState<StaticVaultData>({
    borrowTokenSymbol: null,
    collateralTokenSymbol: null,
    maxLeverage: null,
    lendingName: null,
    isWhitelistActivated: null,
  });

  const [dynamicData, setDynamicData] = useState<DynamicVaultData>({
    deposits: null,
  });

  const { apy: apyData, isLoadingApy, apyLoadFailed, loadApy } = useVaultApy();
  const { pointsRate, isLoadingPointsRate, pointsRateLoadFailed, loadPointsRate } = useVaultPointsRate();

  const [vaultDecimals, setVaultDecimals] = useState<VaultDecimals>({
    sharesDecimals: 18n,
    borrowTokenDecimals: 18n,
    collateralTokenDecimals: 18n,
  });

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoadingTokens: true,
    isLoadingAssets: true,
    isLoadingLeverage: true,
    isLoadingDecimals: true,
    hasLoadedTokens: false,
    hasLoadedAssets: false,
    hasLoadedLeverage: false,
    hasLoadedDecimals: false,
  });

  const [whitelistData, setWhitelistData] = useState<WhitelistData>({
    isWhitelisted: null,
    hasSignature: false,
  });

  const { publicProvider, currentNetwork, address: userAddress, isConnected } = useAppContext();

  const vaultConfig = useMemo(() => {
    if (!currentNetwork) return;
    const vaults = (vaultsConfig as any)[currentNetwork]?.vaults || [];
    return vaults.find((v: any) => v.address.toLowerCase() === address.toLowerCase());
  }, [address, currentNetwork]);

  const vaultContract = useMemo(() => {
    if (!publicProvider) return null;
    return Vault__factory.connect(address, publicProvider);
  }, [address, publicProvider]);

  useEffect(() => {
    if (vaultConfig) {
      const hasTokensFromConfig = !!(vaultConfig.collateralTokenSymbol && vaultConfig.borrowTokenSymbol);
      const hasLeverageFromConfig = !!vaultConfig.leverage;
      const hasLendingNameFromConfig = !!vaultConfig.lendingName;

      if (hasTokensFromConfig || hasLeverageFromConfig || hasLendingNameFromConfig) {
        setLoadingState(prev => ({
          ...prev,
          isLoadingTokens: !hasTokensFromConfig,
          isLoadingLeverage: !hasLeverageFromConfig,
          hasLoadedTokens: hasTokensFromConfig,
          hasLoadedLeverage: hasLeverageFromConfig,
        }));

        setStaticData(prev => ({
          ...prev,
          collateralTokenSymbol: vaultConfig.collateralTokenSymbol || null,
          borrowTokenSymbol: vaultConfig.borrowTokenSymbol || null,
          maxLeverage: vaultConfig.leverage || null,
          lendingName: vaultConfig.lendingName || null,
        }));
      }
    }
  }, [vaultConfig]);

  const loadCollateralTokenSymbol = useCallback(async () => {
    if (!vaultContract || !publicProvider || vaultConfig?.collateralTokenSymbol) return;

    try {
      let symbol: string;
      if (vaultConfig?.collateralTokenAddress) {
        const contract = ERC20__factory.connect(vaultConfig.collateralTokenAddress, publicProvider);
        symbol = await contract.symbol();
      } else {
        const tokenAddress = await vaultContract.collateralToken();
        const contract = ERC20__factory.connect(tokenAddress, publicProvider);
        symbol = await contract.symbol();
      }
      setStaticData(prev => ({ ...prev, collateralTokenSymbol: symbol }));
      setLoadingState(prev => ({ ...prev, hasLoadedTokens: true, isLoadingTokens: false }));
    } catch (err) {
      console.error('Error loading collateral token symbol:', err);
    }
  }, [vaultContract, vaultConfig, publicProvider]);

  const loadBorrowTokenSymbol = useCallback(async () => {
    if (!vaultContract || !publicProvider || vaultConfig?.borrowTokenSymbol) return;

    try {
      let symbol: string;
      if (vaultConfig?.borrowTokenAddress) {
        const contract = ERC20__factory.connect(vaultConfig.borrowTokenAddress, publicProvider);
        symbol = await contract.symbol();
      } else {
        const tokenAddress = await vaultContract.borrowToken();
        console.log('tokenAddress', tokenAddress);
        const contract = ERC20__factory.connect(tokenAddress, publicProvider);
        symbol = await contract.symbol();
      }
      setStaticData(prev => ({ ...prev, borrowTokenSymbol: symbol }));
      setLoadingState(prev => ({ ...prev, hasLoadedTokens: true, isLoadingTokens: false }));
    } catch (err) {
      console.error('Error loading borrow token symbol:', err);
    }
  }, [vaultContract, vaultConfig, publicProvider]);

  const loadMaxLeverage = useCallback(async () => {
    if (!vaultContract || vaultConfig?.leverage) return;

    try {
      const dividend = await vaultContract.targetLtvDividend();
      const divider = await vaultContract.targetLtvDivider();
      const ltv = Number(dividend) / Number(divider);
      const leverage = ltvToLeverage(ltv);
      setStaticData(prev => ({ ...prev, maxLeverage: leverage }));
      setLoadingState(prev => ({ ...prev, hasLoadedLeverage: true, isLoadingLeverage: false }));
    } catch (err) {
      console.error('Error loading max leverage:', err);
    }
  }, [vaultContract, vaultConfig]);

  const loadDecimals = useCallback(async () => {
    if (!vaultContract) return;

    try {
      const newSharesDecimals = await vaultContract.decimals();
      const newBorrowTokenDecimals = await vaultContract.borrowTokenDecimals();
      const newCollateralTokenDecimals = await vaultContract.collateralTokenDecimals();

      setVaultDecimals({
        sharesDecimals: newSharesDecimals,
        borrowTokenDecimals: newBorrowTokenDecimals,
        collateralTokenDecimals: newCollateralTokenDecimals,
      });
      setLoadingState(prev => ({ ...prev, hasLoadedDecimals: true, isLoadingDecimals: false }));
    } catch (err) {
      console.error('Error loading decimals:', err);
      setLoadingState(prev => ({ ...prev, hasLoadedDecimals: true, isLoadingDecimals: false }));
    }
  }, [vaultContract]);

  const loadWhitelistActivation = useCallback(async () => {
    if (!vaultContract) return;

    try {
      const isActivated = await vaultContract.isWhitelistActivated();
      setStaticData(prev => ({ ...prev, isWhitelistActivated: isActivated }));
    } catch (err) {
      console.error('Error loading whitelist activation:', err);
      setStaticData(prev => ({ ...prev, isWhitelistActivated: null }));
    }
  }, [vaultContract]);

  const checkUserSignature = useCallback(() => {
    if (!userAddress || !currentNetwork) {
      setWhitelistData(prev => ({ ...prev, hasSignature: false }));
      return;
    }

    const networkSignatures = (signaturesConfig as any)[currentNetwork];
    const vaultSignatures = networkSignatures?.vaults?.[address.toLowerCase()];
    const signaturesMap = vaultSignatures?.signatures;

    if (!signaturesMap) {
      setWhitelistData(prev => ({ ...prev, hasSignature: false }));
      return;
    }

    const addressLower = userAddress.toLowerCase();
    const hasSignature = !!signaturesMap[addressLower];

    setWhitelistData(prev => ({ ...prev, hasSignature }));
  }, [userAddress, currentNetwork, address]);

  const checkUserWhitelist = useCallback(async () => {
    if (!vaultContract || !userAddress || !isConnected || staticData.isWhitelistActivated === null) {
      return;
    }

    // If whitelist is not activated, everyone is whitelisted
    if (!staticData.isWhitelistActivated) {
      setWhitelistData(prev => ({ ...prev, isWhitelisted: true }));
      return;
    }

    try {
      const whitelistRegistryAddress = await vaultContract.whitelistRegistry();
      if (whitelistRegistryAddress === ZeroAddress) {
        setWhitelistData(prev => ({ ...prev, isWhitelisted: null }));
        return;
      }

      const whitelistRegistry = WhitelistRegistry__factory.connect(whitelistRegistryAddress, publicProvider!);
      const whitelisted = await whitelistRegistry.isAddressWhitelisted(userAddress);
      setWhitelistData(prev => ({ ...prev, isWhitelisted: whitelisted }));
    } catch (err) {
      console.error('Error checking whitelist status:', err);
      setWhitelistData(prev => ({ ...prev, isWhitelisted: null }));
    }
  }, [vaultContract, userAddress, isConnected, staticData.isWhitelistActivated, publicProvider]);

  useEffect(() => {
    if (vaultContract && publicProvider && !vaultConfig?.collateralTokenSymbol) {
      loadCollateralTokenSymbol();
    } else if (vaultConfig?.collateralTokenSymbol) {
      setLoadingState(prev => ({ ...prev, isLoadingTokens: false, hasLoadedTokens: true }));
    }
  }, [vaultContract, publicProvider, vaultConfig, loadCollateralTokenSymbol]);

  useEffect(() => {
    if (vaultContract && publicProvider && !vaultConfig?.borrowTokenSymbol) {
      loadBorrowTokenSymbol();
    } else if (vaultConfig?.borrowTokenSymbol) {
      setLoadingState(prev => ({ ...prev, isLoadingTokens: false, hasLoadedTokens: true }));
    }
  }, [vaultContract, publicProvider, vaultConfig, loadBorrowTokenSymbol]);

  useEffect(() => {
    if (vaultContract && !vaultConfig?.leverage) {
      loadMaxLeverage();
    } else if (vaultConfig?.leverage) {
      setLoadingState(prev => ({ ...prev, isLoadingLeverage: false, hasLoadedLeverage: true }));
    }
  }, [vaultContract, vaultConfig, loadMaxLeverage]);

  useEffect(() => {
    if (vaultContract) {
      loadDecimals();
    }
  }, [vaultContract, loadDecimals]);

  useEffect(() => {
    if (vaultContract) {
      loadWhitelistActivation();
    }
  }, [vaultContract, loadWhitelistActivation]);

  // Check user signature when address or network changes
  useEffect(() => {
    checkUserSignature();
  }, [address, currentNetwork, checkUserSignature]);

  // Check user whitelist status when whitelist activation status is known
  useEffect(() => {
    if (staticData.isWhitelistActivated !== null) {
      checkUserWhitelist();
    }
  }, [staticData.isWhitelistActivated, address, currentNetwork, checkUserWhitelist]);

  const loadDeposits = useCallback(async () => {
    if (!vaultContract) return;

    try {
      const deposits = await vaultContract["totalAssets()"]();
      setDynamicData(prev => ({ ...prev, deposits }));
      setLoadingState(prev => ({ ...prev, hasLoadedAssets: true, isLoadingAssets: false }));
    } catch (err) {
      console.error('Error loading Deposits:', err);
      setLoadingState(prev => ({ ...prev, isLoadingAssets: false }));
    }
  }, [vaultContract]);

  useEffect(() => {
    if (vaultContract) {
      loadDeposits();
    }
  }, [vaultContract, loadDeposits]);

  useAdaptiveInterval(loadDeposits, {
    initialDelay: 12000,
    enabled: !!vaultContract
  });

  useEffect(() => {
    if (!address || !currentNetwork) return;
    loadApy(address, currentNetwork);
  }, [address, currentNetwork]);

  useEffect(() => {
    if (!address || !currentNetwork) return;
    loadPointsRate(address, currentNetwork);
  }, [address, currentNetwork]);

  const formattedDeposits = useMemo(() => {
    if (!dynamicData.deposits) return null;
    return formatUnits(dynamicData.deposits, vaultDecimals.borrowTokenDecimals);
  }, [dynamicData.deposits, vaultDecimals.borrowTokenDecimals]);

  useEffect(() => {
    setDynamicData({ deposits: null });
    setLoadingState(prev => ({ ...prev, isLoadingAssets: true, hasLoadedAssets: false }));
  }, [currentNetwork, address]);

  const tokenPairDisplay = useMemo(() => {
    if (staticData.collateralTokenSymbol && staticData.borrowTokenSymbol) {
      return `${formatTokenSymbol(staticData.collateralTokenSymbol)}/${formatTokenSymbol(staticData.borrowTokenSymbol)}`;
    }
    return null;
  }, [staticData.collateralTokenSymbol, staticData.borrowTokenSymbol]);

  return (
    <Link
      to={`/${address}`}
      state={{
        collateralTokenSymbol: staticData.collateralTokenSymbol,
        borrowTokenSymbol: staticData.borrowTokenSymbol,
        maxLeverage: staticData.maxLeverage,
        lendingName: staticData.lendingName,
        apy: apyData,
        pointsRate,
        isWhitelistActivated: staticData.isWhitelistActivated,
        isWhitelisted: whitelistData.isWhitelisted,
        hasSignature: whitelistData.hasSignature
      }}
      className="wrapper block w-full bg-gray-50 transition-colors border border-gray-50 rounded-lg mb-4 last:mb-0 p-3">
      <div className="w-full">
        <div className="w-full flex flex-row justify-between mb-2">
          <div className="flex items-center text-base font-medium text-gray-900">
            <div className="mr-2 min-w-[60px]">
              <TransitionLoader isLoading={loadingState.isLoadingTokens && !loadingState.hasLoadedTokens}>
                {tokenPairDisplay}
              </TransitionLoader>
            </div>
            <div className="mr-2 font-normal">
              <TransitionLoader isLoading={loadingState.isLoadingLeverage && !loadingState.hasLoadedLeverage}>
                {staticData.maxLeverage ? `x${staticData.maxLeverage}` : null}
              </TransitionLoader>
            </div>
            <div className="font-normal">{staticData.lendingName || "Lending"}</div>
          </div>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <div className="font-medium text-gray-700">Deposited TVL: </div>
        <div className="font-normal text-gray-700 min-w-[100px] text-right">
          <TransitionLoader
            isLoading={
              (loadingState.isLoadingAssets && !loadingState.hasLoadedAssets) ||
              (loadingState.isLoadingTokens && !loadingState.hasLoadedTokens)
            }>
            {formattedDeposits && staticData.borrowTokenSymbol ? (
              <div className="flex justify-end">
                <div className="font-normal text-gray-700 mr-2">
                  <NumberDisplay value={formattedDeposits} />
                </div>
                <div className="font-medium text-gray-700">{formatTokenSymbol(staticData.borrowTokenSymbol)}</div>
              </div>
            ) : null}
          </TransitionLoader>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <div className="font-medium text-gray-700">APY: </div>
        <div className="flex gap-1 font-normal text-gray-700 min-w-[60px] text-right">
          <span className="text-gray-500">7 day:</span>
          <TransitionLoader
            isLoading={isLoadingApy}
            isFailedToLoad={apyLoadFailed}
          >
            {formatApy(apyData ? apyData["7d_apy"] : 0)}
          </TransitionLoader>
          <span className="text-gray-500 ml-2">30 day:</span>
          <TransitionLoader
            isLoading={isLoadingApy}
            isFailedToLoad={apyLoadFailed}
          >
            {formatApy(apyData ? apyData["30d_apy"]: 0)}
          </TransitionLoader>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <div className="font-medium text-gray-700">Points Rate: </div>
        <div className="font-normal text-gray-700 min-w-[60px] text-right">
          <TransitionLoader
            isLoading={isLoadingPointsRate}
            isFailedToLoad={pointsRateLoadFailed}
          >
            {pointsRate ? `~${pointsRate} per 1 token / day` : ''}
          </TransitionLoader>
        </div>
      </div>
    </Link>
  );
}
