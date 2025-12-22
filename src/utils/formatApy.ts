import { ApyData } from "./api";

export enum ApyPeriod {
  SevenDays = '7d',
  ThirtyDays = '30d'
}

export const formatApy = (apyData: ApyData | null, period: ApyPeriod) => {
  if (!apyData) return "0.00%";
  const value = period === ApyPeriod.SevenDays ? apyData["7d_apy"] : apyData["30d_apy"];
  if (!value) return "0.00%";
  return `${value.toFixed(2)}%`;
};
