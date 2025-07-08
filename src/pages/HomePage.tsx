import { Link } from "react-router-dom";
import vaultsConfig from "../../vaults.config.json";
import VaultBlock from "@/components/VaultBlock";

export default function HomePage() {
  const chainId = "11155111";

  const vaults = vaultsConfig[chainId]?.vaults || [];

  return (
    <div className="w-full flex flex-col p-2">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Vaults:</h3>
      {vaults.map((vault, index) => (
        <VaultBlock address={vault.address} key={index} />
      ))}
      {vaults.map((vault, index) => (
        <VaultBlock address={vault.address} key={index} />
      ))}
    </div>
  );
}
