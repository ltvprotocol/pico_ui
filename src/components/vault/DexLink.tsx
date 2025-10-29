import { useVaultContext } from "@/contexts";

export default function DexLink() {
  const { vaultConfig } = useVaultContext();
  const href = vaultConfig?.dexLink;

  if (!href) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-2 mb-4 rounded-md">
      <div className="flex flex-col justify-between">
        <div className="flex flex-col items-start">
          <p className="ml-3 text-sm max-w-[350px]">
            DEX prices may be better than direct deposit or withdraw
          </p>
          <a
            className="ml-3 text-blue-600 hover:text-blue-700 transition-colors text-xl underline"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {vaultConfig.dexLinkName ?? "Dex Link"}
          </a>
        </div>
      </div>
    </div>
  );
}


