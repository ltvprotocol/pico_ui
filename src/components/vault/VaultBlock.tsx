import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatUnits, ZeroAddress } from "ethers";
import { useAppContext } from "@/contexts";
import { formatTokenSymbol, formatApy, ApyPeriod, ltvToLeverage, loadTVL } from "@/utils";
import { useAdaptiveInterval, useVaultApy, useVaultPointsRate } from "@/hooks";
import { Vault__factory, ERC20__factory, WhitelistRegistry__factory } from "@/typechain-types";
import { TransitionLoader } from "@/components/ui";
import CompactNumber from "../ui/CompactNumber";
import VaultStat from "./VaultStat";
import vaultsConfig from "../../../vaults.config.json";

interface VaultBlockProps {
  address: string;
}

interface StaticVaultData {
  borrowTokenSymbol: string | null;
  collateralTokenSymbol: string | null;
  maxLeverage: string | null;
  lendingName: string | null;
  isWhitelistActivated: boolean | null;
  collateralTokenAddress: string | null;
  lendingConnectorAddress: string | null;
}

interface WhitelistData {
  isWhitelisted: boolean | null;
}

interface DynamicVaultData {
  deposits: bigint | null;
  leveragedTvl: bigint | null;
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
    collateralTokenAddress: null,
    lendingConnectorAddress: null,
  });

  const [dynamicData, setDynamicData] = useState<DynamicVaultData>({
    deposits: null,
    leveragedTvl: null,
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
  });

  const { publicProvider, currentNetwork, address: userAddress, isConnected, isMainnet } = useAppContext();

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
          collateralTokenAddress: vaultConfig.collateralTokenAddress || null,
        }));
      }
    }
  }, [vaultConfig]);

  const loadCollateralTokenSymbol = useCallback(async () => {
    if (!vaultContract || !publicProvider) return;

    try {
      let symbol: string;
      let tokenAddress: string;

      if (vaultConfig?.collateralTokenAddress) {
        tokenAddress = vaultConfig.collateralTokenAddress;
      } else {
        tokenAddress = await vaultContract.collateralToken();
      }

      if (!vaultConfig?.collateralTokenSymbol) {
        const contract = ERC20__factory.connect(tokenAddress, publicProvider);
        symbol = await contract.symbol();
        setStaticData(prev => ({ ...prev, collateralTokenSymbol: symbol, collateralTokenAddress: tokenAddress }));
      } else {
        setStaticData(prev => ({ ...prev, collateralTokenAddress: tokenAddress }));
      }

      setLoadingState(prev => ({ ...prev, hasLoadedTokens: true, isLoadingTokens: false }));
    } catch (err) {
      console.error('Error loading collateral token symbol:', err);
    }
  }, [vaultContract, vaultConfig, publicProvider]);

  const loadBorrowTokenSymbol = useCallback(async () => {
    if (!vaultContract || !publicProvider) return;

    try {
      let symbol: string;
      if (vaultConfig?.borrowTokenSymbol) return;

      if (vaultConfig?.borrowTokenAddress) {
        const contract = ERC20__factory.connect(vaultConfig.borrowTokenAddress, publicProvider);
        symbol = await contract.symbol();
      } else {
        const tokenAddress = await vaultContract.borrowToken();
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

  const loadLendingConnector = useCallback(async () => {
    if (!vaultContract) return;
    try {
      const connector = await vaultContract.lendingConnector();
      setStaticData(prev => ({ ...prev, lendingConnectorAddress: connector }));
    } catch (err) {
      console.error('Error loading lending connector:', err);
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
    if (vaultContract && publicProvider) {
      loadCollateralTokenSymbol();
      loadBorrowTokenSymbol();
      loadDecimals();
      loadWhitelistActivation();
      loadLendingConnector();
    }
  }, [vaultContract, publicProvider, loadCollateralTokenSymbol, loadBorrowTokenSymbol, loadDecimals, loadWhitelistActivation, loadLendingConnector]);

  useEffect(() => {
    if (vaultContract && !vaultConfig?.leverage) {
      loadMaxLeverage();
    } else if (vaultConfig?.leverage) {
      setLoadingState(prev => ({ ...prev, isLoadingLeverage: false, hasLoadedLeverage: true }));
    }
  }, [vaultContract, vaultConfig, loadMaxLeverage]);


  // Check user signature when address or network changes


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

  const loadLeveragedTvl = useCallback(async () => {
    if (!publicProvider || !staticData.collateralTokenAddress || !staticData.lendingConnectorAddress || !staticData.lendingName) return;

    try {
      const tvl = await loadTVL(
        address,
        staticData.collateralTokenAddress,
        staticData.lendingConnectorAddress,
        staticData.lendingName,
        publicProvider,
        currentNetwork
      );
      if (tvl !== null) {
        setDynamicData(prev => ({ ...prev, leveragedTvl: tvl }));
      }
    } catch (err) {
      console.error("Error loading leveraged TVL", err);
    }
  }, [publicProvider, staticData.collateralTokenAddress, staticData.lendingConnectorAddress, staticData.lendingName, currentNetwork, address]);

  useEffect(() => {
    if (vaultContract) {
      loadDeposits();
    }
  }, [vaultContract, loadDeposits]);

  useEffect(() => {
    loadLeveragedTvl();
  }, [loadLeveragedTvl]);

  useAdaptiveInterval(loadDeposits, {
    initialDelay: 12000,
    enabled: !!vaultContract
  });

  useAdaptiveInterval(loadLeveragedTvl, {
    initialDelay: 15000,
    enabled: !!(staticData.collateralTokenAddress && staticData.lendingConnectorAddress)
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

  const formattedLeveragedTvl = useMemo(() => {
    if (!dynamicData.leveragedTvl) return null;
    return formatUnits(dynamicData.leveragedTvl, vaultDecimals.collateralTokenDecimals);
  }, [dynamicData.leveragedTvl, vaultDecimals.collateralTokenDecimals]);

  useEffect(() => {
    setDynamicData({ deposits: null, leveragedTvl: null });
    setLoadingState(prev => ({ ...prev, isLoadingAssets: true, hasLoadedAssets: false }));
  }, [currentNetwork, address]);

  const tokenPairDisplay = useMemo(() => {
    if (staticData.collateralTokenSymbol && staticData.borrowTokenSymbol) {
      return `${formatTokenSymbol(staticData.collateralTokenSymbol)} / ${formatTokenSymbol(staticData.borrowTokenSymbol)}`;
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
        isWhitelisted: whitelistData.isWhitelisted
      }}
      className="flex flex-col xl:flex-row xl:justify-start xl:items-center p-5 sm:p-6 wrapper block w-full bg-white border border-gray-200 transition-colors rounded-lg last:mb-0 gap-4 xl:gap-6"
    >
      <div
        className="flex flex-row items-center flex-wrap xl:flex-nowrap xl:items-start xl:flex-col gap-2 xl:w-[220px] xl:shrink-0 text-base">
        <div className="font-medium text-gray-900 leading-none">
          <TransitionLoader isLoading={loadingState.isLoadingTokens && !loadingState.hasLoadedTokens}>
            {tokenPairDisplay}
          </TransitionLoader>
        </div>
        <div className="text-gray-500 font-light">
          <TransitionLoader isLoading={loadingState.isLoadingLeverage && !loadingState.hasLoadedLeverage}>
            {staticData.maxLeverage ? `x${staticData.maxLeverage}` : ''} on {staticData.lendingName || "Lending"}
          </TransitionLoader>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-4 xl:grid xl:grid-cols-[10rem_10rem_5rem_auto] xl:gap-x-4 xl:mr-auto items-center">
        <VaultStat label="Deposited TVL">
          <TransitionLoader
            isLoading={
              (loadingState.isLoadingAssets && !loadingState.hasLoadedAssets) ||
              (loadingState.isLoadingTokens && !loadingState.hasLoadedTokens)
            }>
            <div className="text-[1rem] font-light text-gray-700 leading-none flex gap-1">
              <CompactNumber value={formattedDeposits} />
              <span className="font-medium">{formatTokenSymbol(staticData.borrowTokenSymbol)}</span>
            </div>
          </TransitionLoader>
        </VaultStat>

        <VaultStat label="Levereged TVL">
          <TransitionLoader isLoading={!dynamicData.leveragedTvl && isMainnet}>
            {isMainnet ? (
              <div className="text-[1rem] font-light text-gray-700 leading-none flex gap-1">
                <CompactNumber value={formattedLeveragedTvl} />
                <span className="font-medium">{formatTokenSymbol(staticData.collateralTokenSymbol)}</span>
              </div>
            ) : (
              <span className="text-red-500 italic font-light">Unknown</span>
            )}
          </TransitionLoader>
        </VaultStat>

        <VaultStat label="30d APY" valueClassName="font-medium text-gray-700">
          <TransitionLoader
            isLoading={isLoadingApy}
            isFailedToLoad={apyLoadFailed}
            errorFallback={<span className="text-red-500 italic font-light">Unknown</span>}
          >
            {formatApy(apyData, ApyPeriod.ThirtyDays)}
          </TransitionLoader>
        </VaultStat>

        <VaultStat label="Points Rate" valueClassName="font-normal text-gray-500 whitespace-nowrap">
          <TransitionLoader
            isLoading={isLoadingPointsRate}
            isFailedToLoad={pointsRateLoadFailed}
            errorFallback={<span className="text-red-500 italic font-light">Unknown</span>}
          >
            {pointsRate ? `~${pointsRate} per 1 token / day` : ''}
          </TransitionLoader>
        </VaultStat>
      </div>
      <div className="flex xl:justify-end xl:ml-auto">
        <div
          className="wrapper text-gray-800 border border-gray-400 px-6 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-80 w-full xl:w-auto text-center whitespace-nowrap"
        >
          Open &gt;
        </div>
      </div>
    </Link>
  );
}
