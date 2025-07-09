import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatUnits } from "ethers";

import { useAppContext } from "@/contexts";
import { getMaxLeverage } from "@/utils";
import { Vault__factory, ERC20__factory } from "@/typechain-types";

import { CopyAddress, Loader } from "@/components/ui";

interface VaultBlockProps {
  address: string;
}

export default function VaultBlock( {address} : VaultBlockProps ) {
  const [borrow, setBorrow] = useState<bigint | null>(null);
  const [collateral, setCollateral] = useState<bigint | null>(null);
  const [borrowSymbol, setBorrowSymbol] = useState<string | null>(null);
  const [collateralSymbol, setCollateralSymbol] = useState<string | null>(null);
  const [maxLeverage, setMaxLeverage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { publicProvider } = useAppContext();

  useEffect(() => {
    const getSomething = async () => {
      const vaultContractLens = Vault__factory.connect(address, publicProvider);

      const borrowAddress = await vaultContractLens.borrowToken();
      const collateralAddress = await vaultContractLens.collateralToken();
      const borrowContract = ERC20__factory.connect(borrowAddress, publicProvider);
      const collateralContrace = ERC20__factory.connect(collateralAddress, publicProvider);
      const borSymbol = await borrowContract.symbol();
      const colSymbol = await collateralContrace.symbol();

      setBorrowSymbol(borSymbol);
      setCollateralSymbol(colSymbol);

      const borrowAssets = await vaultContractLens.getRealBorrowAssets();
      const collateralAssets = await vaultContractLens.getRealCollateralAssets();

      setBorrow(borrowAssets);
      setCollateral(collateralAssets);

      const rawLtv = await vaultContractLens.targetLTV();
      const ltv = parseFloat(formatUnits(rawLtv, 18)).toFixed(4);
      const leverage = getMaxLeverage(parseFloat(ltv));

      setMaxLeverage(leverage);
      setLoading(false);
    }

    getSomething();
  }, [publicProvider]);

  return (
    <div className="h-[185px] relative w-full d-block border border-gray-300 p-4 rounded-lg mb-4">
      {loading ? (
        <Loader />
      ) : (
        <div>
          <div className="w-full">
        <div className="w-full flex flex-row justify-between mb-2 hidden sm:flex">
        <div className="flex text-base font-medium text-gray-900">
          <div className="mr-2">
            {collateralSymbol && borrowSymbol ? 
            `${collateralSymbol}/${borrowSymbol}` :
            "Loading..."
          }
          </div>
          <div className="mr-2 font-normal">
            {maxLeverage ? 
            `x${maxLeverage}` :
            "Loading..."
          }
          </div>
          <div className="font-normal">HodlMyBeer</div>
        </div>
        </div>
        <div className="w-full mb-2 sm:hidden">
          <div className="flex text-base font-medium text-gray-900 mb-2">
            {collateralSymbol && borrowSymbol ? 
              `${collateralSymbol}/${borrowSymbol}` :
              "Loading..."
            }
            <div className="font-normal ml-2">HodlMyBeer</div>
          </div>
          <div className="flex font-normal text-gray-700 text-sm">
            <div className="font-medium text-gray-700 mr-2">LTV: </div>
            {maxLeverage ? 
              `${maxLeverage}` :
              "Loading..."
            }
          </div>
        </div>
      </div>
      <CopyAddress className="mb-2" address={address} />
      <div className="w-full flex justify-between text-sm">
        <div className="font-medium text-gray-700">Collateral: </div>
        <div className="font-normal text-gray-700">
        {collateral && collateralSymbol ? 
          <div className="flex">
            <div className="font-normal text-gray-700 mr-2">{`${parseFloat(formatUnits(collateral, 18)).toFixed(4)}`}</div>
            <div className="font-medium text-gray-700">{collateralSymbol}</div>
          </div> :
          "Loading..."
        }
      </div>
      </div>
      <div className="w-full flex justify-between mb-2 text-sm">
        <div className="font-medium text-gray-700">Borrow: </div>
        <div className="font-normal text-gray-700">
          {borrow && borrowSymbol ?
            <div className="flex">
              <div className="font-normal text-gray-700 mr-2">{`${parseFloat(formatUnits(borrow, 18)).toFixed(4)}`}</div>
              <div className="font-medium text-gray-700">{borrowSymbol}</div>
            </div> :
            "Loading..."
          }
        </div>
      </div>
      <Link to={`/${address}`} className="w-full flex justify-center py-2 px-4 border border-blue-300 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors hover:border-blue-600">Open Vault</Link>
        </div>
      )}
    </div>
  );
}
