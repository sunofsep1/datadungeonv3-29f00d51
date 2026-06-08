import { useEffect, useState } from "react";
import { Calendar, Check, ExternalLink, Loader2, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ListingOffer } from "@/hooks/useListingOffers";
import type { OfferCondition } from "@/lib/offerConditions";
import {
  conditionStatusClass,
  conditionStatusLabel,
  effectiveConditionStatus,
} from "@/lib/offerConditions";
import {
  contractMilestoneDetailLine,
  type ContractTimelineMilestone,
} from "@/lib/contractTimeline";
import { cn } from "@/lib/utils";

export type ContractEditFocusField = "exchange" | "unconditional" | "settlement";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: ContractTimelineMilestone | null;
  offer: ListingOffer;
  condition?: OfferCondition | null;
  listingId: string;
  onSaveOfferDate: (field: ContractEditFocusField, dateIso: string) => Promise<void>;
  onUpdateCondition: (input: {
    id: string;
    offer_id: string;
    status?: OfferCondition["status"];
    due_date?: string;
    notes?: string | null;
  }) => Promise<void>;
  onGoUnconditional: () => Promise<void>;
  onOpenFullEditor: (focusField?: ContractEditFocusField) => void;
};

export function ContractMilestoneSheet({
  open,
  onOpenChange,
  milestone,
  offer,
  condition,
  listingId,
  onSaveOfferDate,
  onUpdateCondition,
  onGoUnconditional,
  onOpenFullEditor,
}: Props) {
  const [dateValue, setDateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open || !milestone) return;
    setDateValue(milestone.dateIso);
    setNotes(condition?.notes ?? "");
  }, [open, milestone, condition?.notes]);

  if (!milestone) return null;

  const effStatus =
    milestone.kind === "condition" && condition
      ? effectiveConditionStatus(condition.status, condition.due_date)
      : milestone.conditionStatus;

  const focusField: ContractEditFocusField | undefined =
    milestone.kind === "contract"
      ? "exchange"
      : milestone.kind === "unconditional"
        ? "unconditional"
        : milestone.kind === "settlement"
          ? "settlement"
          : undefined;

  const run = async (fn: () => Promise<void>) => {
    setWorking(true);
    try {
      await fn();
    } finally {
      setWorking(false);
    }
  };

  const handleSaveDate = () => {
    if (!focusField || !dateValue) return;
    void run(async () => {
      await onSaveOfferDate(focusField, dateValue);
      onOpenChange(false);
    });
  };

  const handleSaveConditionDate = () => {
    if (!condition || !dateValue) return;
    void run(async () => {
      await onUpdateCondition({
        id: condition.id,
        offer_id: condition.offer_id,
        due_date: dateValue,
      });
      onOpenChange(false);
    });
  };

  const handleSaveNotes = () => {
    if (!condition) return;
    void run(async () => {
      await onUpdateCondition({
        id: condition.id,
        offer_id: condition.offer_id,
        notes: notes.trim() || null,
      });
    });
  };

  const handleMarkComplete = () => {
    if (!condition) return;
    void run(async () => {
      await onUpdateCondition({
        id: condition.id,
        offer_id: condition.offer_id,
        status: "complete",
      });
      onOpenChange(false);
    });
  };

  const handleWaive = () => {
    if (!condition) return;
    void run(async () => {
      await onUpdateCondition({
        id: condition.id,
        offer_id: condition.offer_id,
        status: "waived",
      });
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="pr-6">{milestone.label}</SheetTitle>
          <SheetDescription>{contractMilestoneDetailLine(milestone)}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>{milestone.weekdayLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[10px] tabular-nums">
                Week {milestone.weekOfContract}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {milestone.phase} phase
              </Badge>
              <Badge variant="outline" className="text-[10px] tabular-nums">
                {milestone.relativeLabel}
              </Badge>
              {effStatus ? (
                <Badge variant="outline" className={cn("text-[10px]", conditionStatusClass(effStatus))}>
                  {conditionStatusLabel(effStatus)}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Day {milestone.dayOfContract} of contract ·{" "}
              {milestone.daysUntilSettlement >= 0
                ? `${milestone.daysUntilSettlement} days until settlement`
                : `${Math.abs(milestone.daysUntilSettlement)} days past settlement`}
            </p>
          </div>

          {milestone.kind === "condition" && condition ? (
            <>
              <div>
                <Label htmlFor="milestone-due-date">Due date</Label>
                <Input
                  id="milestone-due-date"
                  type="date"
                  className="mt-1"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="milestone-notes">Notes</Label>
                <Textarea
                  id="milestone-notes"
                  className="mt-1 min-h-[80px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Solicitor update, buyer bank, etc."
                />
              </div>
              <div className="flex flex-col gap-2">
                {effStatus !== "complete" && effStatus !== "waived" ? (
                  <>
                    <Button type="button" disabled={working} onClick={handleMarkComplete} className="gap-2">
                      {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Mark complete
                    </Button>
                    <Button type="button" variant="outline" disabled={working} onClick={handleWaive} className="gap-2">
                      <XCircle className="h-4 w-4" />
                      Waive condition
                    </Button>
                  </>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={working || dateValue === condition.due_date.slice(0, 10)}
                  onClick={handleSaveConditionDate}
                >
                  Save due date
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={working || notes === (condition.notes ?? "")}
                  onClick={handleSaveNotes}
                >
                  Save notes
                </Button>
              </div>
            </>
          ) : null}

          {focusField ? (
            <div>
              <Label htmlFor="milestone-offer-date">
                {milestone.kind === "contract"
                  ? "Contract / exchange date"
                  : milestone.kind === "unconditional"
                    ? "Expected unconditional date"
                    : "Settlement date"}
              </Label>
              <Input
                id="milestone-offer-date"
                type="date"
                className="mt-1"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
              <Button
                type="button"
                className="mt-3 w-full"
                disabled={working}
                onClick={handleSaveDate}
              >
                Save date
              </Button>
            </div>
          ) : null}

          {milestone.kind === "unconditional" && offer.status === "conditional" ? (
            <Button
              type="button"
              variant="default"
              disabled={working}
              className="w-full gap-2"
              onClick={() => void run(async () => {
                await onGoUnconditional();
                onOpenChange(false);
              })}
            >
              Go unconditional now
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              onOpenFullEditor(focusField);
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open full contract editor
          </Button>

          <p className="text-[10px] text-muted-foreground">
            Offer {offer.ref_code} · Listing {listingId.slice(0, 8)}…
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
