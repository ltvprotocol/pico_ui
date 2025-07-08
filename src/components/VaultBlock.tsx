import { useAppContext } from "@/contexts";
import { Vault__factory, ERC20__factory } from "@/typechain-types";
import { formatUnits } from "ethers";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface VaultBlockProps {
  address: string;
}

export default function VaultBlock( {address} : VaultBlockProps ) {
  const [borrow, setBorrow] = useState<bigint | null>(null);
  const [collateral, setCollateral] = useState<bigint | null>(null);
  const [borrowSymbol, setBorrowSymbol] = useState<string | null>(null);
  const [collateralSymbol, setCollateralSymbol] = useState<string | null>(null);
  const [ltv, setLtv] = useState<bigint | null>(null);
  // const [borrowTokenContract, setBorrowTokenContract] = useState<ERC20 | null>(null);
  // const [collateralTokenContract, setCollateralTokenContract] = useState<ERC20 | null>(null);

  const { publicProvider } = useAppContext();
  const vaultContractLens = Vault__factory.connect(address, publicProvider);

  useEffect(() => {
    const getSomething = async () => {
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

      const targetLtv = await vaultContractLens.targetLTV();
      setLtv(targetLtv);
    }

    getSomething();
  }, [publicProvider]);


  return (
    <Link to={`/${address}`} className="w-full d-block border border-gray-300 p-4 rounded-lg mb-4 transition-colors hover:border-blue-500 hover:bg-gray-100">
      <div className="w-full flex flex-row justify-between mb-2">
        <div className="flex text-base font-medium text-gray-900">
          {collateralSymbol && borrowSymbol ? 
            `${collateralSymbol}/${borrowSymbol}` :
            "Loading..."
          }
          <div className="font-normal ml-2">HodlMyBeer</div>
        </div>
        <div className="flex font-normal text-gray-700 text-sm">
          <div className="font-medium text-gray-700 mr-2">LTV: </div>
          {ltv ? 
            `${parseFloat(formatUnits(ltv, 18)).toFixed(2)}` :
            "Loading..."
          }
        </div>
      </div>
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
      <p className="font-normal text-gray-700 text-sm">{address}</p>
    </Link>
  );
}
