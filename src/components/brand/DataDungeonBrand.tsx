import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DataDungeonBrandProps {
  collapsed?: boolean;
  className?: string;
  asLink?: boolean;
}

/** Pixel-type sidebar lockup — text only, no mascot graphic. */
export function DataDungeonBrand({ collapsed = false, className, asLink = true }: DataDungeonBrandProps) {
  if (collapsed) {
    const icon = (
      <span
        className={cn(
          "font-pixel text-[10px] leading-none tracking-wide text-sidebar-foreground",
          className,
        )}
      >
        DD
      </span>
    );
    return asLink ? (
      <Link to="/dashboard" className="block shrink-0 px-1" aria-label="DataDungeon home">
        {icon}
      </Link>
    ) : (
      icon
    );
  }

  const body = (
    <div className={cn("min-w-0 flex flex-col leading-none", className)}>
      <span className="font-pixel text-[7px] tracking-wide text-amber-200/85">Drako —</span>
      <span className="font-pixel mt-1 text-[16px] tracking-wide text-sidebar-foreground">DataDungeon</span>
      <span className="font-pixel mt-1.5 text-[6px] tracking-wider text-sidebar-foreground/55">CRM Mascot</span>
    </div>
  );

  return asLink ? (
    <Link to="/dashboard" className="min-w-0 shrink hover:opacity-90 transition-opacity" aria-label="DataDungeon home">
      {body}
    </Link>
  ) : (
    body
  );
}
