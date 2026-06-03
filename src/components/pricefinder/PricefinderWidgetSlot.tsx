import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Placeholder for Domain Pricefinder embed when VITE_PRICEFINDER_WIDGET_SCRIPT is configured.
 * Does not load until Domain provides an official embed URL.
 */
export function PricefinderWidgetSlot({ className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptUrl = import.meta.env.VITE_PRICEFINDER_WIDGET_SCRIPT as string | undefined;
  const apiKey = import.meta.env.VITE_PRICEFINDER_WIDGET_KEY as string | undefined;

  useEffect(() => {
    if (!scriptUrl || !apiKey || !containerRef.current) return;

    const mount = containerRef.current;
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const w = window as Window & {
        PricefinderWidget?: { init: (opts: Record<string, unknown>) => void };
      };
      w.PricefinderWidget?.init?.({
        apiKey,
        container: mount,
      });
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
      mount.innerHTML = "";
    };
  }, [scriptUrl, apiKey]);

  if (!scriptUrl || !apiKey) return null;

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/20 p-2", className)}>
      <p className="mb-2 text-[10px] text-muted-foreground">Pricefinder widget (embed)</p>
      <div ref={containerRef} className="min-h-[200px] w-full" />
    </div>
  );
}
