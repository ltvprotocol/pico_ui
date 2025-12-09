import { useAppContext } from '@/contexts';
import { shortAddress } from '@/utils';
import { SEPOLIA_CHAIN_ID_STRING } from '@/constants';

interface AddressProps {
  address: string;
  className?: string;
  full?: boolean;
}

export default function Address({ address, className = '', full = false }: AddressProps) {
  const { currentNetwork } = useAppContext();

  const baseUrl = currentNetwork === SEPOLIA_CHAIN_ID_STRING
    ? 'https://sepolia.etherscan.io/address/'
    : 'https://etherscan.io/address/';

  return (
    <a
      href={`${baseUrl}${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`hover:underline cursor-pointer ${className}`}
    >
      {full ? address : shortAddress(address)}
    </a>
  );
}
