import { useEffect, useState } from "react";
import { formatUnits } from "ethers";
import vaultsConfig from "../../vaults.config.json";
import VaultBlock from "@/components/vault/VaultBlock";
import { useAppContext } from "@/contexts";
import UnrecognizedNetwork from "@/components/vault/UnrecognizedNetwork";
import { isVaultExists } from "@/utils";
import { DescriptionBlock } from "@/components/ui/DescriptionBlock";
import { Vault__factory } from "@/typechain-types";
import CompactNumber from "@/components/ui/CompactNumber";
import { LabeledValue, Loader } from "@/components/ui";

const PILOT_VAULT_TITLE = "How it works?";
const PILOT_VAULT_DESCRIPTION = "The Pilot Vault maximizes staking yield by creating a 12x leveraged position via Aave V3. When you deposit ETH or wstETH, the vault uses wstETH as collateral to borrow WETH, which is then converted into more wstETH. This automated cycle amplifies your staking rewards. By maintaining a constant target LTV, the vault captures high-efficiency yields while simplifying complex DeFi strategies.";

const POINTS_TITLE = "Points Program";
const POINTS_DESCRIPTION = "Points measure your contribution to the protocol. Earn automatically by depositing into vaults. Points accrue based on amount and duration. Increase size or hold longer to earn more. For a significant boost, hold a 42 NFT ";

const NFT_TITLE = "42 NFT";
const NFT_DESCRIPTION = "A limited-edition NFT for early participants granting a +42% points boost, priority vault access, and expanding benefits over time. Get whitelisted by depositing into vault, or use a promocode found in our";

const NO_VAULTS_TEXT = "No vaults available yet. We're preparing new opportunities, please return later to explore the latest vaults once they're deployed."

export default function Home() {
  const { currentNetwork, unrecognizedNetworkParam, publicProvider, isTermsBlockingUI, isMainnet, address } = useAppContext();

  const [existingVaultAddresses, setExistingVaultAddresses] = useState<string[]>([]);
  const [checksDone, setChecksDone] = useState<boolean>(false);

  const [totalPositionEth, setTotalPositionEth] = useState<number>(0);
  const [isLoadingPosition, setIsLoadingPosition] = useState<boolean>(true);

  if (unrecognizedNetworkParam || !currentNetwork) {
    return <UnrecognizedNetwork />;
  }

  const configuredVaults = (vaultsConfig as any)[currentNetwork]?.vaults || [];

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
  }, [publicProvider, currentNetwork]);

  // Load User Positions
  useEffect(() => {
    const loadUserPositions = async () => {
      if (!isMainnet || !publicProvider || !address || existingVaultAddresses.length === 0) {
        setTotalPositionEth(0);
        setIsLoadingPosition(false);
        return;
      }

      setIsLoadingPosition(true);

      try {
        let totalEth = 0;

        await Promise.all(
          existingVaultAddresses.map(async (vaultAddress) => {
            try {
              const vaultContract = Vault__factory.connect(vaultAddress, publicProvider);
              const sharesBalance = await vaultContract.balanceOf(address);

              if (sharesBalance > 0n) {
                const assets = await vaultContract.convertToAssets(sharesBalance); // now just convert to assets
                const assetsFormatted = Number(formatUnits(assets, 18n)); // for now because we have only one vault in mainnet hardcoded

                totalEth += assetsFormatted;
              }
            } catch (err) {
              console.error(`Error loading position for vault ${vaultAddress}:`, err);
            }
          })
        );

        setTotalPositionEth(totalEth);
      } catch (err) {
        console.error("Error loading total user position:", err);
      } finally {
        setIsLoadingPosition(false);
      }
    };

    loadUserPositions();
  }, [isMainnet, publicProvider, address, existingVaultAddresses]);

  const disabledClassName = isTermsBlockingUI ? 'opacity-50 pointer-events-none' : '';

  return (
    <div className={`w-full flex flex-col items-center ${disabledClassName}`}>
      {isMainnet && (
        <div className="w-full max-w-[1300px] px-4 sm:px-6 lg:px-8 mb-8">
          <div className="text-[2.5rem] font-normal text-gray-900 mb-0.5 leading-none">
            {isLoadingPosition ? (
              <Loader className="h-10 w-32" />
            ) : (
              <LabeledValue
                label="Your Position"
                value={
                  <div className="flex items-baseline gap-2">
                    <CompactNumber value={totalPositionEth} maximumFractionDigits={4} className="font-normal" />
                    <span className="font-light text-gray-500">ETH</span>
                  </div>
                }
              />
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-[1300px] flex flex-col gap-4 px-4 sm:px-6 lg:px-8">
        {checksDone && existingVaultAddresses.length === 0 && (
          <div className="text-sm text-gray-600 italic">{NO_VAULTS_TEXT}</div>
        )}

        {existingVaultAddresses.map((address) => (
          <VaultBlock address={address} key={address} />
        ))}

        {isMainnet && (
          <div className="p-5 rounded-lg bg-white mt-2">
            <DescriptionBlock title={PILOT_VAULT_TITLE} className="mb-4">
              {PILOT_VAULT_DESCRIPTION}
            </DescriptionBlock>
            <div className="flex flex-col gap-5">
              <div className="flex-1">
                <DescriptionBlock title={POINTS_TITLE}>
                  {POINTS_DESCRIPTION}
                </DescriptionBlock>
                <a href="https://leaderboard.ltv.finance" target="_blank"
                  className="block mt-2 text-sm text-indigo-500 transition-colors w-fit hover:underline hover:text-indigo-600">
                  View leaderboard &rarr;
                </a>
              </div>
              <div className="flex-1">
                <DescriptionBlock title={NFT_TITLE}>
                  {NFT_DESCRIPTION}{" "}
                  <a href="https://discord.com" target="_blank"
                    className="font-bold underline text-indigo-700 hover:no-underline">Discord</a>.
                </DescriptionBlock>
                <a href="https://42.ltv.finance" target="_blank"
                  className="block mt-2 text-sm text-indigo-500 transition-colors w-fit hover:underline hover:text-indigo-600">
                  Mint Now &rarr;
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
