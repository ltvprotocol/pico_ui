import React from "react";
import { useCopyToClipboard } from "usehooks-ts";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

interface CopyAddressProps {
  className?: string;
  address: string;
}
 
export function CopyAddress({ className, address } : CopyAddressProps ) {
  const [, copy] = useCopyToClipboard();
  const [copied, setCopied] = React.useState(false);
 
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className="text-sm mr-2">
          <div className="hidden sm:block text-sm text-gray-700 break-all">
            {address}
          </div>
          <div className="block sm:hidden text-sm text-gray-700 break-all">
            {address ? `${address.slice(0, 6)}...${address.slice(-12)}` : ''}
          </div>
        </div>
        <button
          className="bg-transparent m-0 p-0 pb-1 hover:border-none border-none"
          onMouseLeave={() => setCopied(false)}
          onClick={() => {
            copy(address);
            setCopied(true);
          }}
          >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-gray" />
          ) : (
            <DocumentDuplicateIcon className="h-4 w-4 text-gray" />
          )}
        </button>
      </div>
    </div>
  );
}
