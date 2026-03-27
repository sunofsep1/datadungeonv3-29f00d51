import { useEffect, useState } from "react";

const COMMISSION_RATE_STORAGE_KEY = "settings.defaultCommissionRate";
const DEFAULT_COMMISSION_RATE = 2.5;

function parseRate(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_COMMISSION_RATE;
  return Math.min(10, Math.max(0, parsed));
}

export function useCommissionRate() {
  const [commissionRate, setCommissionRateState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_COMMISSION_RATE;
    return parseRate(window.localStorage.getItem(COMMISSION_RATE_STORAGE_KEY));
  });

  useEffect(() => {
    window.localStorage.setItem(COMMISSION_RATE_STORAGE_KEY, String(commissionRate));
  }, [commissionRate]);

  const setCommissionRate = (next: number) => {
    if (!Number.isFinite(next)) return;
    setCommissionRateState(Math.min(10, Math.max(0, next)));
  };

  return { commissionRate, setCommissionRate };
}
