import * as React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Container for full-width page-level segmented tabs (matches Nurture). */
export const segmentedTabsListClassName =
  "grid h-11 w-full gap-1 rounded-lg border border-border bg-muted/40 p-1";

/** Trigger styling inside {@link segmentedTabsListClassName} / {@link SegmentedTabsList}. */
export const segmentedTabsTriggerClassName =
  "rounded-md text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

/** Shorter bar for dashboard widgets and dense toolbars. */
export const segmentedTabsListCompactClassName =
  "grid h-9 w-full gap-1 rounded-lg border border-border bg-muted/40 p-1";

export const segmentedTabsTriggerCompactClassName =
  "rounded-md px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

export const SegmentedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList ref={ref} className={cn(segmentedTabsListClassName, className)} {...props} />
));
SegmentedTabsList.displayName = "SegmentedTabsList";

export const SegmentedTabsListCompact = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList ref={ref} className={cn(segmentedTabsListCompactClassName, className)} {...props} />
));
SegmentedTabsListCompact.displayName = "SegmentedTabsListCompact";

type SegmentedTabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsTrigger> & {
  compact?: boolean;
};

export const SegmentedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  SegmentedTabsTriggerProps
>(({ className, compact, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(compact ? segmentedTabsTriggerCompactClassName : segmentedTabsTriggerClassName, className)}
    {...props}
  />
));
SegmentedTabsTrigger.displayName = "SegmentedTabsTrigger";
