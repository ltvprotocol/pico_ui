import { useVaultContext } from "@/contexts";

export default function DexLink() {
  const { vaultConfig } = useVaultContext();
  const href = vaultConfig?.dexLink;

  if (!href) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4 rounded-md">
      <div className="flex flex-col items-center justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="ml-3 text-sm text-blue-700">
            Maybe in DEX it's more profitable right now.
          </p>
        </div>
        <div className="flex items-center gap-1 ml-auto [@media(max-width:450px)]:hidden">
          <div className="text-blue-400">{"---------------------->"}</div>
          <a
            className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open DEX
          </a>
          <div className="text-blue-400">{"<----------------------"}</div>
        </div>
        <div className="hidden items-center gap-1 ml-auto [@media(max-width:450px)]:flex">
          <div className="text-blue-400">{"------>"}</div>
          <a
            className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open DEX
          </a>
          <div className="text-blue-400">{"<------"}</div>
        </div>
      </div>
    </div>
  );
}


