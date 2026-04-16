import { Dropdown, Divider, DescriptionBlock } from '@/components/ui';
import { ApyBlock } from "./ApyBlock";
import { TvlBlock } from "./TvlBlock";
import { CapacityBlock } from "./CapacityBlock";

const TVL_TITLE = "What are Leveraged and Deposited TVLs?";
const TVL_DESCRIPTION = "Leveraged TVL represents the total value of the yield-bearing collateral (wstETH) held in the vault's position, which has been amplified to maximize returns. Deposited TVL shows the actual amount of ETH users have contributed to the vault, reflecting the total net capital.";

const CAPACITY_TITLE = "What is vault capacity and how it works?";
const CAPACITY_DESCRIPTION = "Vault capacity is the maximum amount of ETH that can be deposited into a specific vault, measured directly by the Deposited TVL. This limit is set in the underlying asset (ETH) and can be adjusted by the protocol to ensure optimal balance and security for the vault's leveraged position.";

export default function VaultInfoDropdown() {
  return (
    <Dropdown title="Vault" isOpen={true}>
      <ApyBlock />

      <Divider className="my-6 md:my-8" />

      <div className="flex flex-col gap-6 md:gap-8">
        <DescriptionBlock title={TVL_TITLE}>
          {TVL_DESCRIPTION}
        </DescriptionBlock>
        <TvlBlock />
      </div>

      <Divider className="my-6 md:my-8" />

      <div className="flex flex-col gap-6 md:gap-8">
        <DescriptionBlock title={CAPACITY_TITLE}>
          {CAPACITY_DESCRIPTION}
        </DescriptionBlock>
        <CapacityBlock />
      </div>
    </Dropdown>
  );
}
