import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  useContactBuyerRequirements,
  useCreateBuyerRequirement,
  useUpdateBuyerRequirement,
  useDeleteBuyerRequirement,
  type BuyerRequirement,
} from "@/hooks/useBuyerRequirements";
import { formatRequirementSummary } from "@/lib/buyerRequirementMatch";
import { LISTING_FEATURE_CATALOG } from "@/lib/listingFeatures";
import { PROPERTY_TYPE_VALUES } from "@/lib/propertyType";

type Props = { contactId: string };

type FormState = {
  action: string;
  property_type: string;
  state: string;
  suburbs: string;
  price_min: string;
  price_max: string;
  beds_min: string;
  baths_min: string;
  parking_min: string;
  land_min_sqm: string;
  land_max_sqm: string;
  building_min_sqm: string;
  building_max_sqm: string;
  features_required: string[];
  notes: string;
};

const emptyForm = (): FormState => ({
  action: "buy",
  property_type: "",
  state: "QLD",
  suburbs: "",
  price_min: "",
  price_max: "",
  beds_min: "",
  baths_min: "",
  parking_min: "",
  land_min_sqm: "",
  land_max_sqm: "",
  building_min_sqm: "",
  building_max_sqm: "",
  features_required: [],
  notes: "",
});

function parseNum(raw: string): number | null {
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formFromReq(r: BuyerRequirement): FormState {
  return {
    action: r.action?.trim() || "buy",
    property_type: r.property_type?.trim() ?? "",
    state: r.state?.trim() || "QLD",
    suburbs: (r.suburbs ?? []).join(", "),
    price_min: r.price_min != null ? String(r.price_min) : "",
    price_max: r.price_max != null ? String(r.price_max) : "",
    beds_min: r.beds_min != null ? String(r.beds_min) : "",
    baths_min: r.baths_min != null ? String(r.baths_min) : "",
    parking_min: r.parking_min != null ? String(r.parking_min) : "",
    land_min_sqm: r.land_min_sqm != null ? String(r.land_min_sqm) : "",
    land_max_sqm: r.land_max_sqm != null ? String(r.land_max_sqm) : "",
    building_min_sqm: r.building_min_sqm != null ? String(r.building_min_sqm) : "",
    building_max_sqm: r.building_max_sqm != null ? String(r.building_max_sqm) : "",
    features_required: [...(r.features_required ?? [])],
    notes: r.notes ?? "",
  };
}

export function ContactBuyerRequirementsPanel({ contactId }: Props) {
  const { toast } = useToast();
  const { data: requirements = [], isLoading } = useContactBuyerRequirements(contactId);
  const createReq = useCreateBuyerRequirement();
  const updateReq = useUpdateBuyerRequirement();
  const deleteReq = useDeleteBuyerRequirement();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerRequirement | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (r: BuyerRequirement) => {
    setEditing(r);
    setForm(formFromReq(r));
    setOpen(true);
  };

  const toggleFeature = (key: string) => {
    setForm((f) => {
      const has = f.features_required.includes(key);
      return {
        ...f,
        features_required: has
          ? f.features_required.filter((k) => k !== key)
          : [...f.features_required, key],
      };
    });
  };

  const save = async () => {
    const suburbs = form.suburbs
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      contact_id: contactId,
      action: form.action,
      property_type: form.property_type.trim() || null,
      state: form.state.trim() || "QLD",
      suburbs,
      price_min: parseNum(form.price_min),
      price_max: parseNum(form.price_max),
      beds_min: parseNum(form.beds_min),
      baths_min: parseNum(form.baths_min),
      parking_min: parseNum(form.parking_min),
      land_min_sqm: parseNum(form.land_min_sqm),
      land_max_sqm: parseNum(form.land_max_sqm),
      building_min_sqm: parseNum(form.building_min_sqm),
      building_max_sqm: parseNum(form.building_max_sqm),
      features_required: form.features_required,
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) {
        await updateReq.mutateAsync({ id: editing.id, ...payload });
        toast({ title: "Requirement updated" });
      } else {
        await createReq.mutateAsync(payload);
        toast({ title: "Requirement added" });
      }
      setOpen(false);
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const remove = async (r: BuyerRequirement) => {
    try {
      await deleteReq.mutateAsync({ id: r.id, contactId });
      toast({ title: "Requirement removed" });
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="zoho-card p-5 sm:p-6 border-border">
      <PanelHeader openNew={openNew} count={requirements.length} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : requirements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved buyer briefs. Add suburbs and budget to match this contact to listings.
        </p>
      ) : (
        <ul className="space-y-2">
          {requirements.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-muted/10 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{formatRequirementSummary(r)}</p>
                {r.notes ? (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.notes}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => void remove(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit buyer brief" : "Add buyer brief"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Action</Label>
                <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State</Label>
                <Input className="mt-1" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Property type</Label>
              <Select
                value={form.property_type || "any"}
                onValueChange={(v) => setForm({ ...form, property_type: v === "any" ? "" : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {PROPERTY_TYPE_VALUES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Suburbs (comma-separated)</Label>
              <Input
                className="mt-1"
                value={form.suburbs}
                onChange={(e) => setForm({ ...form, suburbs: e.target.value })}
                placeholder="Bulimba, Hawthorne"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price min</Label>
                <Input className="mt-1" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
              </div>
              <div>
                <Label>Price max</Label>
                <Input className="mt-1" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Beds+</Label>
                <Input className="mt-1" value={form.beds_min} onChange={(e) => setForm({ ...form, beds_min: e.target.value })} />
              </div>
              <div>
                <Label>Baths+</Label>
                <Input className="mt-1" value={form.baths_min} onChange={(e) => setForm({ ...form, baths_min: e.target.value })} />
              </div>
              <div>
                <Label>Parking+</Label>
                <Input className="mt-1" value={form.parking_min} onChange={(e) => setForm({ ...form, parking_min: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Land min (sqm)</Label>
                <Input className="mt-1" value={form.land_min_sqm} onChange={(e) => setForm({ ...form, land_min_sqm: e.target.value })} />
              </div>
              <div>
                <Label>Land max (sqm)</Label>
                <Input className="mt-1" value={form.land_max_sqm} onChange={(e) => setForm({ ...form, land_max_sqm: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Building min (sqm)</Label>
                <Input className="mt-1" value={form.building_min_sqm} onChange={(e) => setForm({ ...form, building_min_sqm: e.target.value })} />
              </div>
              <div>
                <Label>Building max (sqm)</Label>
                <Input className="mt-1" value={form.building_max_sqm} onChange={(e) => setForm({ ...form, building_max_sqm: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Required features ({form.features_required.length})</Label>
              <ScrollArea className="h-36 mt-2 rounded-md border border-border p-2">
                <div className="grid grid-cols-1 gap-1.5">
                  {LISTING_FEATURE_CATALOG.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={form.features_required.includes(f.key)}
                        onCheckedChange={() => toggleFeature(f.key)}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button type="button" className="w-full" onClick={() => void save()} disabled={createReq.isPending || updateReq.isPending}>
              {editing ? "Save changes" : "Add brief"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PanelHeader({ openNew, count }: { openNew: () => void; count: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Buyer requirements</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {count} saved brief{count !== 1 ? "s" : ""} — used for Match Buyers on listings
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={openNew}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}
