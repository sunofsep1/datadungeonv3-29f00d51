import { useState, useEffect, useRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface ContactExpandableSectionProps {
  title: string;
  badge?: React.ReactNode;
  summary?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  id?: string;
}

export function ContactExpandableSection({
  title,
  badge,
  summary,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  id,
  className,
  headerAction,
}: ContactExpandableSectionProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;

  const bodyRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const triggerId = useId();

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!open || !bodyRef.current || reducedMotion) return;
    const targetHeight = bodyRef.current.scrollHeight;
    if (targetHeight > 0) {
      bodyRef.current.style.maxHeight = `${targetHeight}px`;
    }
  }, [open, reducedMotion, children]);

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn("border border-border rounded-lg bg-card overflow-hidden", className)} id={id}>
      <div
        id={triggerId}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className="group flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          {badge}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!open && summary && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
              {summary}
            </span>
          )}
          {headerAction && <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>}
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
              reducedMotion && "transition-none",
              "opacity-40 group-hover:opacity-100"
            )}
          />
        </div>
      </div>

      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        ref={bodyRef}
        className="contact-section-body border-t border-border"
        style={
          reducedMotion
            ? { display: open ? "block" : "none" }
            : {
                maxHeight: open ? "2000px" : "0",
                opacity: open ? 1 : 0,
                pointerEvents: open ? "auto" : "none",
              }
        }
      >
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

export function ContactExpandableSectionSkeleton() {
  return (
    <div className="border border-border rounded-lg bg-card px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-20 rounded bg-muted" />
        <Skeleton className="h-3 w-32 rounded bg-muted ml-auto" />
      </div>
    </div>
  );
}
