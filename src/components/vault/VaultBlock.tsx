import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "ethers";
import { useAppContext } from "@/contexts";
import { ltvToLeverage, fetchApy, fetchPointsRate } from "@/utils";
import { useAdaptiveInterval } from "@/hooks";
import { Vault__factory, ERC20__factory } from "@/typechain-types";
import { NumberDisplay } from "@/components/ui";
import { renderWithTransition } from "@/helpers/renderWithTransition";
import vaultsConfig from "../../../vaults.config.json";

interface VaultBlockProps {
  address: string;
}

interface StaticVaultData {
  borrowTokenSymbol: string | null;
  collateralTokenSymbol: string | null;
  maxLeverage: string | null;
  lendingName: string | null;
}

interface DynamicVaultData {
  tvl: bigint | null;
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
  });

  const [dynamicData, setDynamicData] = useState<DynamicVaultData>({
    tvl: null,
  });

  const [apyData, setApyData] = useState<{ apy: number | null; pointsRate: number | null }>({
    apy: null,
    pointsRate: null,
  });
  const [isLoadingApy, setIsLoadingApy] = useState<boolean>(false);
  const [apyLoadFailed, setApyLoadFailed] = useState<boolean>(false);
  const [pointsRateLoadFailed, setPointsRateLoadFailed] = useState<boolean>(false);

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

  const { publicProvider, currentNetwork } = useAppContext();

  const loadApyAndPointsRate = useCallback(async () => {
    try {
      setIsLoadingApy(true);
      setApyLoadFailed(false);
      setPointsRateLoadFailed(false);
      
      const [apyResult, pointsRateResult] = await Promise.all([
        fetchApy(address),
        fetchPointsRate(address)
      ]);
      
      setApyData({
        apy: apyResult,
        pointsRate: pointsRateResult,
      });
      
      if (apyResult === null) {
        setApyLoadFailed(true);
      }
      if (pointsRateResult === null) {
        setPointsRateLoadFailed(true);
      }
    } catch (err) {
      console.error('Error loading APY and points rate:', err);
      setApyLoadFailed(true);
      setPointsRateLoadFailed(true);
    } finally {
      setIsLoadingApy(false);
    }
  }, [address]);

  const memoizedApyData = useMemo(() => apyData, [apyData.apy, apyData.pointsRate]);

  const vaultConfig = useMemo(() => {
    const chainId = currentNetwork || "11155111"; // Default to Sepolia if no network
    const vaults = (vaultsConfig as any)[chainId]?.vaults || [];
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

        setStaticData({
          collateralTokenSymbol: vaultConfig.collateralTokenSymbol || null,
          borrowTokenSymbol: vaultConfig.borrowTokenSymbol || null,
          maxLeverage: vaultConfig.leverage || null,
          lendingName: vaultConfig.lendingName || null,
        });
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

  const loadTvl = useCallback(async () => {
    if (!vaultContract) return;

    try {
      const tvl = await vaultContract["totalAssets()"]();
      setDynamicData({ tvl });
      setLoadingState(prev => ({ ...prev, hasLoadedAssets: true, isLoadingAssets: false }));
    } catch (err) {
      console.error('Error loading TVL:', err);
      setLoadingState(prev => ({ ...prev, isLoadingAssets: false }));
    }
  }, [vaultContract]);

  useEffect(() => {
    if (vaultContract) {
      loadTvl();
    }
  }, [vaultContract, loadTvl]);

  useAdaptiveInterval(loadTvl, {
    initialDelay: 12000,
    enabled: !!vaultContract
  });

  useEffect(() => {
    loadApyAndPointsRate();
  }, [loadApyAndPointsRate]);

  const formattedTvl = useMemo(() => {
    if (!dynamicData.tvl) return null;
    return formatUnits(dynamicData.tvl, vaultDecimals.borrowTokenDecimals);
  }, [dynamicData.tvl, vaultDecimals.borrowTokenDecimals]);

  useEffect(() => {
    setDynamicData({ tvl: null });
    setLoadingState(prev => ({ ...prev, isLoadingAssets: true, hasLoadedAssets: false }));
  }, [currentNetwork, address]);

  const tokenPairDisplay = useMemo(() => {
    if (staticData.collateralTokenSymbol && staticData.borrowTokenSymbol) {
      return `${staticData.collateralTokenSymbol}/${staticData.borrowTokenSymbol}`;
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
          apy: memoizedApyData.apy,
          pointsRate: memoizedApyData.pointsRate
        }}
        className="wrapper block w-full bg-gray-50 transition-colors border border-gray-50 rounded-lg mb-4 last:mb-0 p-3">
        <div className="w-full">
          <div className="w-full flex flex-row justify-between mb-2">
            <div className="flex items-center text-base font-medium text-gray-900">
              <div className="mr-2 min-w-[60px]">
                {renderWithTransition(
                  tokenPairDisplay,
                  loadingState.isLoadingTokens && !loadingState.hasLoadedTokens
                )}
              </div>
              <div className="mr-2 font-normal">
                {renderWithTransition(
                  staticData.maxLeverage ? `x${staticData.maxLeverage}` : null,
                  loadingState.isLoadingLeverage && !loadingState.hasLoadedLeverage
                )}
              </div>
              <div className="font-normal">{staticData.lendingName || "Lending"}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="font-medium text-gray-700">TVL: </div>
          <div className="font-normal text-gray-700 min-w-[100px] text-right">
            {renderWithTransition(
              formattedTvl && staticData.borrowTokenSymbol ? (
                <div className="flex justify-end">
                  <div className="font-normal text-gray-700 mr-2">
                    <NumberDisplay value={formattedTvl} />
                  </div>
                  <div className="font-medium text-gray-700">{staticData.borrowTokenSymbol}</div>
                </div>
              ) : null,
              (loadingState.isLoadingAssets && !loadingState.hasLoadedAssets) ||
              (loadingState.isLoadingTokens && !loadingState.hasLoadedTokens)
            )}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="font-medium text-gray-700">APY: </div>
          <div className="font-normal text-gray-700 min-w-[60px] text-right">
            {renderWithTransition(
              memoizedApyData.apy !== null ? `${memoizedApyData.apy.toFixed(2)}%` : 
              apyLoadFailed ? <span className="text-red-500 italic text-xs">Failed to load</span> : null,
              isLoadingApy && !apyLoadFailed
            )}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <div className="font-medium text-gray-700">Points: </div>
          <div className="font-normal text-gray-700 min-w-[60px] text-right">
            {renderWithTransition(
              memoizedApyData.pointsRate !== null ? `${memoizedApyData.pointsRate}/day` : 
              pointsRateLoadFailed ? <span className="text-red-500 italic text-xs">Failed to load</span> : null,
              isLoadingApy && !pointsRateLoadFailed
            )}
          </div>
        </div>
      </Link>
  );
}
