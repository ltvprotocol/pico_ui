import { useState, useEffect } from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { renderWithTransition } from "@/helpers/renderWithTransition";

interface CopyAddressProps {
  className?: string;
  address?: string;
}
 
export function CopyAddress({ className, address} : CopyAddressProps ) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address || address === '') {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [address]);

  const handleCopy = () => {
    if (address && address !== '' && !isLoading) {
      copy(address);
      setCopied(true);
    }
  };
 
  return (
    <div className={className}>
      <div className="flex items-center text-gray-300">
        <div className="text-sm mr-2">
          <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" className="hidden sm:block text-sm text-gray-700 break-all hover:underline">
            {renderWithTransition(
              address,
              isLoading,
              `w-[321.18px]`
            )}
          </a>
          <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" className="block sm:hidden text-sm text-gray-700 break-all hover:underline">
            {renderWithTransition(
              address ? `${address.slice(0, 6)}...${address.slice(-12)}` : '',
              isLoading,
              `w-[151.65px]`
            )}
          </a>
        </div>
        <button
          className="bg-transparent m-0 p-0 pb-1 hover:border-none border-none outline-none focus:outline-none focus:ring-0 disabled:opacity-50"
          onMouseLeave={() => setCopied(false)}
          onClick={handleCopy}
          disabled={isLoading || !address}
        >
          {isLoading ? (
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          ) : copied ? (
            <CheckIcon className="h-4 w-4 text-gray" />
          ) : (
            <DocumentDuplicateIcon className="h-4 w-4 text-gray" />
          )}
        </button>
      </div>
    </div>
  );
}
