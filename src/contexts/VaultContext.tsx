import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react'
import { formatUnits, ZeroAddress } from 'ethers'
import { useAppContext } from '@/contexts/AppContext';
import { Vault, WETH, ERC20, Vault__factory, WETH__factory, ERC20__factory, LendingConnector__factory } from '@/typechain-types';
import { ltvToLeverage, truncate } from '@/utils';
import vaultsConfig from '../../vaults.config.json';
import { WETH_ADDRESS } from '@/constants';

interface VaultConfig {
  address: string;
  collateralTokenAddress: string;
  borrowTokenAddress: string;
  sharesSymbol: string;
  collateralTokenSymbol: string;
  borrowTokenSymbol: string;
  leverage: string;
  targetLTV: string;
  maxSafeLTV: string;
  minProfitLTV: string;
  lendingName: string;
  lendingAddress: string;
};

interface VaultContextType {
  vaultAddress: string;
  collateralTokenAddress: string;
  borrowTokenAddress: string;
  lendingAddress: string | null;
  lendingName: string | null;
  maxLeverage: string | null;
  sharesSymbol: string;
  borrowTokenSymbol: string;
  collateralTokenSymbol: string;
  vault: Vault | null;
  borrowToken: ERC20 | WETH | null;
  collateralToken: ERC20 | WETH | null;
  vaultLens: Vault | null;
  borrowTokenLens: ERC20 | WETH | null;
  collateralTokenLens: ERC20 | WETH | null;
  decimals: bigint;
  vaultConfig: VaultConfig | undefined;
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
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultContextProvider = ({ children, vaultAddress }: { children: ReactNode, vaultAddress: string }) => {
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | undefined>(undefined);
  const [collateralTokenAddress, setCollateralTokenAddress] = useState<string>(ZeroAddress);
  const [borrowTokenAddress, setBorrowTokenAddress] = useState<string>(ZeroAddress);

  const [sharesSymbol, setSharesSymbol] = useState<string>('');
  const [borrowTokenSymbol, setBorrowTokenSymbol] = useState<string>('');
  const [collateralTokenSymbol, setCollateralTokenSymbol] = useState<string>('');
  const [lendingName, setLendingName] = useState<string | null>(null);
  const [lendingAddress, setLendingAddress] = useState<string | null>(null);
  const [maxLeverage, setMaxLeverage] = useState<string | null>(null);

  const [contractsSet, setContractsSet] = useState(false);

  const [vault, setVault] = useState<Vault | null>(null);
  const [borrowToken, setBorrowToken] = useState<ERC20 | WETH | null>(null);
  const [collateralToken, setCollateralToken] = useState<ERC20 | WETH | null>(null);
  const [vaultLens, setVaultLens] = useState<Vault | null>(null);
  const [borrowTokenLens, setBorrowTokenLens] = useState<ERC20 | WETH | null>(null);
  const [collateralTokenLens, setCollateralTokenLens] = useState<ERC20 | WETH | null>(null);

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

    const isBorrowTokenWeth = borrowTokenAddress === WETH_ADDRESS;

    const rawBorrowTokenBalance = await borrowTokenLens.balanceOf(address);
    const borrowTokenBalance = parseFloat(formatUnits(rawBorrowTokenBalance, decimals));

    const rawEthBalance = isBorrowTokenWeth ?  await publicProvider.getBalance(address) : 0n;
    const ethBalance = parseFloat(formatUnits(rawEthBalance, decimals));

    const rawVaultMaxDeposit = await vaultLens.maxDeposit(address);
    const vaultMaxDeposit = parseFloat(formatUnits(rawVaultMaxDeposit, decimals));

    const maxAvailable = Math.min(borrowTokenBalance + ethBalance, vaultMaxDeposit);
    setMaxDeposit(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, borrowTokenLens, borrowTokenAddress, decimals]);

  const updateMaxRedeem = useCallback(async () => {
    if (!address || !vaultLens) return;

    const rawSharesBalance = await vaultLens.balanceOf(address);
    const sharesBalance = parseFloat(formatUnits(rawSharesBalance, decimals));

    const rawVaultMaxRedeem = await vaultLens.maxRedeem(address);
    const vaultMaxRedeem = parseFloat(formatUnits(rawVaultMaxRedeem, decimals));

    const maxAvailable = Math.min(sharesBalance, vaultMaxRedeem);
    setMaxRedeem(truncate(maxAvailable, 4));
  }, [address, vaultLens, decimals]);

  const updateMaxMint = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !borrowTokenLens) return;

    const isBorrowTokenWeth = borrowTokenAddress === WETH_ADDRESS;

    const rawBorrowTokenBalance = await borrowTokenLens.balanceOf(address);
    const rawSharesForBorrowToken = await vaultLens.previewDeposit(rawBorrowTokenBalance);
    const sharesForBorrowToken = parseFloat(formatUnits(rawSharesForBorrowToken, decimals));

    const rawEthBalance = isBorrowTokenWeth ? await publicProvider.getBalance(address) : 0n;
    const rawSharesForEth = await vaultLens.previewDeposit(rawEthBalance);
    const sharesForEth = parseFloat(formatUnits(rawSharesForEth, decimals));

    const rawVaultMaxMint = await vaultLens.maxMint(address);
    const vaultMaxMint = parseFloat(formatUnits(rawVaultMaxMint, decimals));

    const maxAvailable = Math.min(sharesForBorrowToken + sharesForEth, vaultMaxMint);
    setMaxMint(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, borrowTokenLens, borrowTokenAddress, decimals]);

  const updateMaxWithdraw = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens) return;

    const rawSharesBalance = await vaultLens.balanceOf(address);
    const rawPreviwedRedeem = await vaultLens.previewRedeem(rawSharesBalance);
    const previewedRedeem = parseFloat(formatUnits(rawPreviwedRedeem, decimals));

    const rawVaultMaxWithdraw = await vaultLens.maxWithdraw(address);
    const vaultMaxWithdraw = parseFloat(formatUnits(rawVaultMaxWithdraw, decimals));

    const maxAvailable = Math.min(previewedRedeem, vaultMaxWithdraw);
    setMaxWithdraw(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, decimals]);

  const updateMaxDepositCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !collateralTokenLens) return;

    const isCollateralTokenWeth = collateralTokenAddress === WETH_ADDRESS;

    const rawCollateralTokenBalance = await collateralTokenLens.balanceOf(address);
    const collateralTokenBalance = parseFloat(formatUnits(rawCollateralTokenBalance, decimals));

    const rawEthBalance = isCollateralTokenWeth ?  await publicProvider.getBalance(address) : 0n;
    const ethBalance = parseFloat(formatUnits(rawEthBalance, decimals));

    const rawVaultMaxDeposit = await vaultLens.maxDepositCollateral(address);
    const vaultMaxDeposit = parseFloat(formatUnits(rawVaultMaxDeposit, decimals));

    const maxAvailable = Math.min(collateralTokenBalance + ethBalance, vaultMaxDeposit);
    setMaxDepositCollateral(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, collateralTokenLens, collateralTokenAddress, decimals]);

  const updateMaxRedeemCollateral = useCallback(async () => {
    if (!address || !vaultLens) return;

    const rawSharesBalance = await vaultLens.balanceOf(address);
    const sharesBalance = parseFloat(formatUnits(rawSharesBalance, decimals));

    const rawVaultMaxRedeem = await vaultLens.maxRedeemCollateral(address);
    const vaultMaxRedeem = parseFloat(formatUnits(rawVaultMaxRedeem, decimals));

    const maxAvailable = Math.min(sharesBalance, vaultMaxRedeem);
    setMaxRedeemCollateral(truncate(maxAvailable, 4));
  }, [address, vaultLens, decimals]);

  const updateMaxMintCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens || !collateralTokenLens) return;

    const isCollateralTokenWeth = collateralTokenAddress === WETH_ADDRESS;

    const rawCollateralTokenBalance = await collateralTokenLens.balanceOf(address);
    const rawSharesForCollateral = await vaultLens.previewDepositCollateral(rawCollateralTokenBalance);
    const sharesForCollateral = parseFloat(formatUnits(rawSharesForCollateral, decimals));

    const rawEthBalance = isCollateralTokenWeth ?  await publicProvider.getBalance(address) : 0n;
    const rawSharesForEth = await vaultLens.previewDepositCollateral(rawEthBalance);
    const sharesForEth = parseFloat(formatUnits(rawSharesForEth, decimals));

    const rawVaultMaxMint = await vaultLens.maxMintCollateral(address);
    const vaultMaxMint = parseFloat(formatUnits(rawVaultMaxMint, decimals));

    const maxAvailable = Math.min(sharesForCollateral + sharesForEth, vaultMaxMint);
    setMaxMintCollateral(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, collateralTokenLens, collateralTokenAddress, decimals]);

  const updateMaxWithdrawCollateral = useCallback(async () => {
    if (!publicProvider || !address || !vaultLens) return;

    const rawSharesBalance = await vaultLens.balanceOf(address);
    const rawVaultMaxRedeem = await vaultLens.previewRedeemCollateral(rawSharesBalance);
    const vaultMaxRedeem = parseFloat(formatUnits(rawVaultMaxRedeem, decimals));

    const rawVaultMaxWithdraw = await vaultLens.maxWithdrawCollateral(address);
    const vaultMaxWithdraw = parseFloat(formatUnits(rawVaultMaxWithdraw, decimals));

    const maxAvailable = Math.min(vaultMaxRedeem, vaultMaxWithdraw);
    setMaxWithdrawCollateral(truncate(maxAvailable, 4));
  }, [publicProvider, address, vaultLens, decimals]);

  const setupCofig = () => {
    const chainId = "11155111";
    const vaults = vaultsConfig[chainId]?.vaults || [];
    const config = vaults.find(v => v.address.toLowerCase() === vaultAddress.toLowerCase());
    setVaultConfig(config)
  };

  const setupContracts = async () => {
    if (!publicProvider) return;

    try {
      const vaultLensInstance = Vault__factory.connect(vaultAddress, publicProvider);
      setVaultLens(vaultLensInstance);

      const newCollateralTokenAddress = 
        vaultConfig?.collateralTokenAddress ? 
        vaultConfig?.collateralTokenAddress :
        await vaultLensInstance.collateralToken();

      setCollateralTokenAddress(newCollateralTokenAddress);

      const newBorrowTokenAddress = 
        vaultConfig?.borrowTokenAddress ? 
        vaultConfig?.borrowTokenAddress :
        await vaultLensInstance.borrowToken();

      setBorrowTokenAddress(newBorrowTokenAddress);

      if (newCollateralTokenAddress === WETH_ADDRESS) {
        const contract = WETH__factory.connect(newCollateralTokenAddress, publicProvider);
        setCollateralTokenLens(contract);
      } else {
        const contract = ERC20__factory.connect(newCollateralTokenAddress, publicProvider);
        setCollateralTokenLens(contract);
      }

      if (newBorrowTokenAddress === WETH_ADDRESS) {
        const contract = WETH__factory.connect(newBorrowTokenAddress, publicProvider);
        setBorrowTokenLens(contract);
      } else {
        const contract = ERC20__factory.connect(newBorrowTokenAddress, publicProvider);
        setBorrowTokenLens(contract);
      }

      const newDecimals = await vaultLensInstance.decimals();
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

        if (newCollateralTokenAddress === WETH_ADDRESS) {
          const contract = WETH__factory.connect(newCollateralTokenAddress, signer);
          setCollateralToken(contract);
        } else {
          const contract = ERC20__factory.connect(newCollateralTokenAddress, signer);
          setCollateralToken(contract);
        }

        if (newBorrowTokenAddress === WETH_ADDRESS) {
          const contract = WETH__factory.connect(newBorrowTokenAddress, signer);
          setBorrowToken(contract);
        } else {
          const contract = ERC20__factory.connect(newBorrowTokenAddress, signer);
          setBorrowToken(contract);
        }
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

    if (vaultConfig?.sharesSymbol) {
      setSharesSymbol(vaultConfig.sharesSymbol);
    } else {
      const symbol = await vaultLens.symbol();
      setSharesSymbol(symbol);
    }

    if (vaultConfig?.collateralTokenSymbol) {
      setCollateralTokenSymbol(vaultConfig.collateralTokenSymbol);
    } else {
      const symbol = await collateralTokenLens.symbol();
      setCollateralTokenSymbol(symbol);
    }

    if (vaultConfig?.borrowTokenSymbol) {
      setBorrowTokenSymbol(vaultConfig.borrowTokenSymbol);
    } else {
      const symbol = await borrowTokenLens.symbol();
      setBorrowTokenSymbol(symbol);
    }

    if (vaultConfig?.leverage) {
      setMaxLeverage(vaultConfig.leverage);
    } else {
      const rawLtv = await vaultLens.targetLTV();
      const ltv = parseFloat(formatUnits(rawLtv, 18));
      const leverage = ltvToLeverage(ltv);

      setMaxLeverage(leverage);
    }

    if (vaultConfig?.lendingName) {
      setLendingName(vaultConfig.lendingName);
    } else {
      setLendingName("Lending");
    }

    if (vaultConfig?.lendingAddress) {
      setLendingAddress(vaultConfig.lendingAddress);
    } else {
      const lendingConnector = await vaultLens.lendingConnector();
      const lending = LendingConnector__factory.connect(lendingConnector, publicProvider)
      const lendingProtocol = await lending.lendingProtocol();

      setLendingAddress(lendingProtocol);
    }
  };

  useEffect(() => {
    setupCofig();
    setupContracts();

    if(contractsSet) {
      loadSymbols();
    }
  }, [publicProvider, signer, isConnected, contractsSet]);

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
        decimals,
        vaultConfig,
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