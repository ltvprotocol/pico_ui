export interface TvlData {
  usd: string;
  collateral: string;
  borrow: string;
  collateralSymbol: string;
  borrowSymbol: string;
  isLoading: boolean;
}

export function TvlStat({ title, data }: { title: string; data: TvlData }) {
  return (
    <div className="flex gap-2 flex-col">
      <div className="text-sm text-gray-500 mb-1 font-normal">{title}</div>
      <div className="text-3xl md:text-[2.5rem] font-medium text-gray-900 mb-0.5 flex items-baseline gap-1">
        {data.usd} <span className="text-2xl text-gray-500 uppercase">$</span>
      </div>
      <div>
        <div className="text-sm text-gray-500">
          ≈ {data.collateral} {data.collateralSymbol}
        </div>
        <div className="text-sm text-gray-500">
          ≈ {data.borrow} {data.borrowSymbol}
        </div>
      </div>
    </div>
  );
}
