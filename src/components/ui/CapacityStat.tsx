export interface CapacityStatsData {
  depositedUsd: string;
  maxUsd: string;
  depositedBorrow: string;
  maxBorrow: string;
  depositedCollateral: string;
  maxCollateral: string;
  borrowSymbol: string;
  collateralSymbol: string;
}

interface CapacityStatsProps {
  data: CapacityStatsData;
}

export function CapacityStat({ data }: CapacityStatsProps) {
  return (
    <div className="text-left flex flex-col mb-4">
      <div className="text-2xl md:text-3xl text-gray-900 font-normal">
        {data.depositedUsd} / {data.maxUsd} <span className="text-2xl text-gray-500 uppercase">$</span>
      </div>
      <div className="text-sm text-gray-500 mt-0.5">
        ≈ {data.depositedBorrow} / {data.maxBorrow} {data.borrowSymbol}
      </div>
      <div className="text-sm text-gray-500 mt-0.5">
        ≈ {data.depositedCollateral} / {data.maxCollateral} {data.collateralSymbol}
      </div>
    </div>
  );
}
