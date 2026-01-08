import { formatUnits } from 'ethers';
import { NumberDisplay, SymbolWithTooltip } from '@/components/ui';
import { useVaultContext } from '@/contexts';
import { TokenType } from '@/types/actions';
import { formatTokenSymbol } from '@/utils';

export interface PreviewItem {
  amount: bigint;
  tokenType: TokenType;
}

interface PreviewBoxProps {
  receive: PreviewItem[];
  provide: PreviewItem[];
  isLoading: boolean;
  title?: string;
}

export const PreviewBox: React.FC<PreviewBoxProps> = ({
  receive,
  provide,
  isLoading,
  title = 'Preview'
}) => {
  const {
    sharesSymbol,
    sharesDecimals,
    borrowTokenSymbol,
    borrowTokenDecimals,
    collateralTokenSymbol,
    collateralTokenDecimals,
  } = useVaultContext();

  const getTokenMetadata = (tokenType: TokenType) => {
    if (tokenType === 'borrow') {
      return {
        label: 'Borrow Assets',
        symbol: formatTokenSymbol(borrowTokenSymbol),
        decimals: Number(borrowTokenDecimals)
      };
    } else if (tokenType === 'collateral') {
      return {
        label: 'Collateral Assets',
        symbol: formatTokenSymbol(collateralTokenSymbol),
        decimals: Number(collateralTokenDecimals)
      };
    } else {
      return {
        label: 'Leveraged Tokens',
        symbol: sharesSymbol,
        decimals: Number(sharesDecimals)
      };
    }
  };

  const firstProvideSymbol = provide[0] ? getTokenMetadata(provide[0].tokenType).symbol : '';
  const firstReceiveSymbol = receive[0] ? getTokenMetadata(receive[0].tokenType).symbol : '';

  return (
    <div className="@container bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span className="text-sm text-gray-500">{isLoading && " (Loading...)"}</span>
      </div>
      <div className="space-y-4">
        {provide.length > 0 && (
          <div className={`${provide.length === 1 && firstProvideSymbol.length <= 9 ? "flex justify-between @[700px]:block" : ""} border border-orange-200 rounded-lg p-3`}>
            <div className={`flex items-center space-x-2 ${provide.length !== 1 && firstProvideSymbol.length <= 9 ? "mb-2" : "@[700px]:mb-2"}`}>
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
              </svg>
              <p className="text-sm font-semibold text-orange-800">Give</p>
            </div>
            <div className="space-y-2">
              {provide.map((item, idx) => {
                const metadata = getTokenMetadata(item.tokenType);
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="hidden @[700px]:inline text-sm font-medium text-gray-700">{metadata.label}:</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">
                        <NumberDisplay value={formatUnits(item.amount, metadata.decimals)} />
                      </span>
                      <span className="font-medium text-gray-700">
                        {item.tokenType === 'shares'
                          ? <SymbolWithTooltip
                            symbol={metadata.symbol}
                            placeholder='Levereged Tokens'
                            elementId={`preview-provide-shares-${idx}`}
                            isLoading={!metadata.symbol}
                          />
                          : metadata.symbol
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {receive.length > 0 && (
          <div className={`${receive.length === 1 && firstReceiveSymbol.length <= 9 ? "flex justify-between @[700px]:block" : ""} border border-orange-200 rounded-lg p-3`}>
            <div className={`flex items-center space-x-2 ${receive.length === 1 && firstReceiveSymbol.length <= 9 ? "mb-2" : "@[700px]:mb-2"}`}>
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-sm font-semibold text-green-800">Receive</p>
            </div>
            <div className="space-y-2">
              {receive.map((item, idx) => {
                const metadata = getTokenMetadata(item.tokenType);
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="hidden @[700px]:inline text-sm font-medium text-gray-700">{metadata.label}:</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">
                        <NumberDisplay value={formatUnits(item.amount, metadata.decimals)} />
                      </span>
                      <span className="font-medium text-gray-700">
                        {item.tokenType === 'shares'
                          ? <SymbolWithTooltip
                            symbol={metadata.symbol}
                            placeholder='Levereged Tokens'
                            elementId={`preview-receive-shares-${idx}`}
                            isLoading={!metadata.symbol}
                          />
                          : metadata.symbol
                        }
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {receive.length === 0 && provide.length === 0 && (
          <div className="text-center py-4">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No changes required</p>
          </div>
        )}
      </div>
    </div>
  );
};
