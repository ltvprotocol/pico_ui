import { useEffect, useState } from "react";
import vaultsConfig from "../../vaults.config.json";
import VaultBlock from "@/components/vault/VaultBlock";
import { useAppContext } from "@/contexts";
import UnrecognizedNetwork from "@/components/vault/UnrecognizedNetwork";
import { isVaultExists } from "@/utils";

export default function Home() {
  const { currentNetwork, unrecognizedNetworkParam, publicProvider } = useAppContext();

  if (unrecognizedNetworkParam) {
    return <UnrecognizedNetwork />;
  }

  const chainId = currentNetwork || "11155111";
  const configuredVaults = (vaultsConfig as any)[chainId]?.vaults || [];

  const [existingVaultAddresses, setExistingVaultAddresses] = useState<string[]>([]);
  const [checksDone, setChecksDone] = useState<boolean>(false);

  useEffect(() => {
    const checkAll = async () => {
      if (!publicProvider) {
        setExistingVaultAddresses([]);
        setChecksDone(true);
        return;
      }

      try {
        const results = await Promise.all(
          configuredVaults.map(async (v: any) => {
            const exists = await isVaultExists(v.address, publicProvider);
            return exists ? v.address : null;
          })
        );
        setExistingVaultAddresses(results.filter((x): x is string => Boolean(x)));
      } finally {
        setChecksDone(true);
      }
    };

    setChecksDone(false);
    setExistingVaultAddresses([]);
    checkAll();
  }, [publicProvider, chainId]);

  return (
    <div className="w-full flex flex-col">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Vaults:</h3>
      {checksDone && existingVaultAddresses.length === 0 && (
        <div className="text-sm text-gray-600 italic">No vaults available yet. We’re preparing new opportunities, please return later to explore the latest vaults once they’re deployed.</div>
      )}
      {existingVaultAddresses.map((address) => (
        <VaultBlock address={address} key={address} />
      ))}
    </div>
  );
}
