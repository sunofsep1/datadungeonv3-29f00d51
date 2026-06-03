import { useEffect, useState } from "react";

const COMMISSION_RATE_STORAGE_KEY = "settings.defaultCommissionRate";
const DEFAULT_COMMISSION_RATE = 2.5;

function parseRate(value: string | null): number {
  if (value === null || value === "") return DEFAULT_COMMISSION_RATE;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_COMMISSION_RATE;
  // Treat stored 0 as unset so projected GCI uses a sensible default (change in Settings anytime).
  if (parsed === 0) return DEFAULT_COMMISSION_RATE;
  return Math.min(10, Math.max(0, parsed));
}

export function useCommissionRate() {
  const [commissionRate, setCommissionRateState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_COMMISSION_RATE;
    const raw = window.localStorage.getItem(COMMISSION_RATE_STORAGE_KEY);
    if (raw === "0") {
      window.localStorage.setItem(COMMISSION_RATE_STORAGE_KEY, String(DEFAULT_COMMISSION_RATE));
      return DEFAULT_COMMISSION_RATE;
    }
    return parseRate(raw);
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
