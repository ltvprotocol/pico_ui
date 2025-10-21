import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "@/contexts";
import { ltvToLeverage, fetchApy, fetchPointsRate } from "@/utils";
import { Vault__factory, ERC20__factory } from "@/typechain-types";
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

interface LoadingState {
  isLoadingTokens: boolean;
  isLoadingLeverage: boolean;
  hasLoadedTokens: boolean;
  hasLoadedLeverage: boolean;
}

export default function VaultBlock({ address }: VaultBlockProps) {
  const [staticData, setStaticData] = useState<StaticVaultData>({
    borrowTokenSymbol: null,
    collateralTokenSymbol: null,
    maxLeverage: null,
    lendingName: null,
  });

  const [apyData, setApyData] = useState<{ apy: number | null; pointsRate: number | null }>({
    apy: null,
    pointsRate: null,
  });

  const [isLoadingApy, setIsLoadingApy] = useState<boolean>(false);
  const [apyLoadFailed, setApyLoadFailed] = useState<boolean>(false);
  const [pointsRateLoadFailed, setPointsRateLoadFailed] = useState<boolean>(false);

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoadingTokens: true,
    isLoadingLeverage: true,
    hasLoadedTokens: false,
    hasLoadedLeverage: false,
  });

  const { publicProvider } = useAppContext();

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
    const chainId = "11155111";
    const vaults = vaultsConfig[chainId]?.vaults || [];
    return vaults.find(v => v.address.toLowerCase() === address.toLowerCase());
  }, [address]);

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
    loadApyAndPointsRate();
  }, [loadApyAndPointsRate]);

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
      className="
        wrapper block w-full bg-gray-50 transition-colors 
        border border-gray-50 rounded-lg mb-4 last:mb-0 p-3
      ">
      <div className="w-full flex justify-center items-center">
        <div className="w-full flex justify-center mb-2 hidden sm:flex">
          <div className="flex items-center text-base font-medium text-gray-900">
            <div className="mr-2 min-w-[60px]">
              {renderWithTransition(
                tokenPairDisplay,
                loadingState.isLoadingTokens && !loadingState.hasLoadedTokens
              )}
            </div>
            <div className="mr-2">
              {renderWithTransition(
                staticData.maxLeverage ? `x${staticData.maxLeverage}` : null,
                loadingState.isLoadingLeverage && !loadingState.hasLoadedLeverage
              )}
            </div>
            <div className="">{staticData.lendingName || "Lending"}</div>
          </div>
        </div>
        <div className="w-full mb-2 sm:hidden">
          <div className="flex text-base font-medium text-gray-900 mb-2">
            <div className="min-w-[60px]">
              {renderWithTransition(
                tokenPairDisplay,
                loadingState.isLoadingTokens && !loadingState.hasLoadedTokens
              )}
            </div>
            <div className=" ml-2">{staticData.lendingName || "Lending"}</div>
          </div>
          <div className="flex  text-gray-700 text-sm">
            <div className="font-medium text-gray-700 mr-2">LTV: </div>
            <div className="min-w-[40px]">
              {renderWithTransition(
                staticData.maxLeverage ? `${staticData.maxLeverage}` : null,
                loadingState.isLoadingLeverage && !loadingState.hasLoadedLeverage
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-between text-sm mb-2 text-gray-600">
        <div className="flex gap-1 flex-1 justify-center text-sm">
          <div className="font-medium text-gray-900">APY: </div>
          <div className="text-right">
            {renderWithTransition(
              memoizedApyData.apy !== null ? `${memoizedApyData.apy.toFixed(2)}%` : 
              apyLoadFailed ? <span className="text-red-500 italic text-xs">Failed to load</span> : null,
              isLoadingApy && !apyLoadFailed
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-1 justify-center text-sm">
          <div className="font-medium text-gray-900">Points: </div>
          <div className="text-right">
            {renderWithTransition(
              memoizedApyData.pointsRate !== null ? `${memoizedApyData.pointsRate}/day` : 
              pointsRateLoadFailed ? <span className="text-red-500 italic text-xs">Failed to load</span> : null,
              isLoadingApy && !pointsRateLoadFailed
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
