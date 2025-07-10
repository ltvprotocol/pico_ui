import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "ethers";

import { useAppContext } from "@/contexts";
import { getMaxLeverage } from "@/utils";
import { Vault__factory, ERC20__factory } from "@/typechain-types";

import { CopyAddress } from "@/components/ui";

import vaultsConfig from "../../../vaults.config.json";

interface VaultBlockProps {
  address: string;
}

export default function VaultBlock( {address} : VaultBlockProps ) {
  const [borrowAssets, setBorrowAssets] = useState<bigint | null>(null);
  const [collateralAssets, setCollateralAssets] = useState<bigint | null>(null);
  const [borrowTokenSymbol, setBorrowTokenSymbol] = useState<string | null>(null);
  const [collateralTokenSymbol, setCollateralTokenSymbol] = useState<string | null>(null);
  const [maxLeverage, setMaxLeverage] = useState<string | null>(null);
  const [lendingName, setLendingName] = useState<string | null>(null);

  const { publicProvider } = useAppContext();

  useEffect(() => {
    const getVaultAbout = async () => {
      const chainId = "11155111";

      const vaults = vaultsConfig[chainId]?.vaults || [];
      const vault = vaults.find(v => v.address.toLowerCase() === address.toLowerCase());

      const vaultContractLens = Vault__factory.connect(address, publicProvider);

      if (vault?.collateralTokenSymbol) {
        setCollateralTokenSymbol(vault.collateralTokenSymbol);
      } else {
        if (vault?.collateralTokenAddress) {
          const contract = ERC20__factory.connect(vault.collateralTokenAddress, publicProvider);
          const symbol = await contract.symbol();
          setCollateralTokenSymbol(symbol);
        } else {
          const tokenAddress = await vaultContractLens.collateralToken();
          const contract = ERC20__factory.connect(tokenAddress, publicProvider);
          const symbol = await contract.symbol();
          setCollateralTokenSymbol(symbol);
        }
      }

      if (vault?.borrowTokenSymbol) {
        setBorrowTokenSymbol(vault.borrowTokenSymbol);
      } else {
        if (vault?.borrowTokenAddress) {
          const contract = ERC20__factory.connect(vault.borrowTokenAddress, publicProvider);
          const symbol = await contract.symbol();
          setBorrowTokenSymbol(symbol);
        } else {
          const tokenAddress = await vaultContractLens.borrowToken();
          const contract = ERC20__factory.connect(tokenAddress, publicProvider);
          const symbol = await contract.symbol();
          setBorrowTokenSymbol(symbol);
        }
      }

      if (vault?.leverage) {
        setMaxLeverage(vault.leverage);
      } else {
        const rawLtv = await vaultContractLens.targetLTV();
        const ltv = parseFloat(formatUnits(rawLtv, 18)).toFixed(4);
        const leverage = getMaxLeverage(parseFloat(ltv));

        setMaxLeverage(leverage);
      }

      if(vault?.lendingName) {
        setLendingName(vault.lendingName);
      }

      const [newBorrowAssets, newCollateralAssets] = await Promise.all([
        vaultContractLens.getRealBorrowAssets(),
        vaultContractLens.getRealCollateralAssets(),
      ]);

      setBorrowAssets(newBorrowAssets);
      setCollateralAssets(newCollateralAssets);
    }

    getVaultAbout();
  }, [publicProvider]);

  return (
    <>
      <CopyAddress className="mb-2" address={address} />
      <Link to={`/${address}`} className="wrapper block w-full bg-gray-50 transition-colors border border-gray-50 rounded-lg mb-12 last:mb-0 p-3">
        <div className="w-full">
          <div className="w-full flex flex-row justify-between mb-2 hidden sm:flex">
          <div className="flex items-center text-base font-medium text-gray-900">
            <div className="mr-2">
              {collateralTokenSymbol && borrowTokenSymbol ? 
              `${collateralTokenSymbol}/${borrowTokenSymbol}` :
              "..."
            }
            </div>
            <div className="mr-2 font-normal">
              {maxLeverage ? 
              `x${maxLeverage}` :
              "..."
            }
            </div>
            <div className="font-normal">{lendingName ? lendingName : "Lending"}</div>
          </div>
          </div>
          <div className="w-full mb-2 sm:hidden">
            <div className="flex text-base font-medium text-gray-900 mb-2">
              {collateralTokenSymbol && borrowTokenSymbol ? 
                `${collateralTokenSymbol}/${borrowTokenSymbol}` :
                "..."
              }
              <div className="font-normal ml-2">{lendingName ? lendingName : "Lending"}</div>
            </div>
            <div className="flex font-normal text-gray-700 text-sm">
              <div className="font-medium text-gray-700 mr-2">LTV: </div>
              {maxLeverage ? 
                `${maxLeverage}` :
                "..."
              }
            </div>
          </div>
        </div>
        <div className="w-full flex justify-between text-sm">
          <div className="font-medium text-gray-700">Collateral: </div>
          <div className="font-normal text-gray-700">
          {collateralAssets && collateralTokenSymbol ? 
            <div className="flex">
              <div className="font-normal text-gray-700 mr-2">{`${parseFloat(formatUnits(collateralAssets, 18)).toFixed(4)}`}</div>
              <div className="font-medium text-gray-700">{collateralTokenSymbol}</div>
            </div> :
            "..."
          }
        </div>
        </div>
        <div className="w-full flex justify-between text-sm">
          <div className="font-medium text-gray-700">Borrow: </div>
          <div className="font-normal text-gray-700">
            {borrowAssets && borrowTokenSymbol ?
              <div className="flex">
                <div className="font-normal text-gray-700 mr-2">{`${parseFloat(formatUnits(borrowAssets, 18)).toFixed(4)}`}</div>
                <div className="font-medium text-gray-700">{borrowTokenSymbol}</div>
              </div> :
              "..."
            }
          </div>
        </div>
      </Link>
    </>
  );
}
