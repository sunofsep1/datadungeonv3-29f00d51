import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CONTACT_SUBSCRIPTION_LABELS,
  SUGGESTED_CONTACT_CLASSES,
  type ContactSubscriptionKind,
} from "@/lib/contactSubscriptions";
import {
  allSubscriptionKinds,
  subscriptionIsActive,
  useContactClassAssignments,
  useContactClasses,
  useContactSubscriptions,
  useCreateContactClass,
  useSetContactClassAssignments,
  useUpsertContactSubscription,
} from "@/hooks/useContactClasses";
import { cn } from "@/lib/utils";

type Props = { contactId: string };

export function ContactClassesSubscriptionsPanel({ contactId }: Props) {
  const { toast } = useToast();
  const { data: classes = [] } = useContactClasses();
  const { data: assignments = [] } = useContactClassAssignments(contactId);
  const { data: subs = [] } = useContactSubscriptions(contactId);
  const createClass = useCreateContactClass();
  const setAssignments = useSetContactClassAssignments();
  const upsertSub = useUpsertContactSubscription();
  const [newClassName, setNewClassName] = useState("");

  const assignedIds = useMemo(
    () => new Set(assignments.map((a) => a.class_id)),
    [assignments],
  );

  const toggleClass = async (classId: string) => {
    const next = new Set(assignedIds);
    if (next.has(classId)) next.delete(classId);
    else next.add(classId);
    try {
      await setAssignments.mutateAsync({ contactId, classIds: [...next] });
    } catch (e) {
      toast({
        title: "Could not update classes",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const addClassByName = async (name: string) => {
    const existing = classes.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const cls = existing ?? (await createClass.mutateAsync(name));
    if (!assignedIds.has(cls.id)) {
      await setAssignments.mutateAsync({
        contactId,
        classIds: [...assignedIds, cls.id],
      });
    }
  };

  const toggleSub = async (kind: ContactSubscriptionKind, subscribed: boolean) => {
    try {
      await upsertSub.mutateAsync({ contactId, kind, subscribed });
    } catch (e) {
      toast({
        title: "Could not update subscription",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-5 sm:p-6 border-border">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">
        Contact classes & subscriptions
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Reapit-style segments and marketing opt-ins for this contact.
      </p>

      <div className="space-y-4">
        <div>
          <Label className="text-xs uppercase text-muted-foreground">Classes</Label>
          {classes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {classes.map((c) => {
                const on = assignedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void toggleClass(c.id)}
                    disabled={setAssignments.isPending}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-foreground border-border hover:bg-muted/50",
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">No classes yet — add one below.</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {SUGGESTED_CONTACT_CLASSES.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="cursor-pointer font-normal hover:bg-muted/50"
                onClick={() => void addClassByName(name)}
              >
                + {name}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="New class name"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="h-9"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 gap-1"
              disabled={!newClassName.trim() || createClass.isPending}
              onClick={() => {
                const n = newClassName.trim();
                setNewClassName("");
                void addClassByName(n);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Label className="text-xs uppercase text-muted-foreground">Subscriptions</Label>
          <ul className="mt-2 space-y-2">
            {allSubscriptionKinds().map((kind) => (
              <li key={kind} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{CONTACT_SUBSCRIPTION_LABELS[kind]}</span>
                <Switch
                  checked={subscriptionIsActive(subs, kind)}
                  onCheckedChange={(checked) => void toggleSub(kind, checked)}
                  disabled={upsertSub.isPending}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
