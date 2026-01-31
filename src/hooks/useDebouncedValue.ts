import { useState, useEffect } from "react";

/**
 * Returns a value that updates only after `delay` ms have passed since the last update to `value`.
 * Use for debouncing search input (e.g. 300ms).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
