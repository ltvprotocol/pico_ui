import vaultsConfig from "../../vaults.config.json";
import VaultBlock from "@/components/vault/VaultBlock";
import { useAppContext } from "@/contexts";

export default function Home() {
  const { currentNetwork } = useAppContext();
  
  const chainId = currentNetwork || "11155111";
  const vaults = vaultsConfig[chainId as keyof typeof vaultsConfig]?.vaults || [];

  return (
    <div className="w-full flex flex-col">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Vaults:</h3>
      {vaults.map((vault, index) => (
        <VaultBlock address={vault.address} key={index} />
      ))}
    </div>
  );
}
