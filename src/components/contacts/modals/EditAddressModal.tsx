import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddContactAddress,
  useUpdateContactAddress,
  type ContactAddress,
  type ContactAddressInsert,
} from "@/hooks/useContactAddresses";
import { useToast } from "@/hooks/use-toast";

const ADDRESS_TYPES = ["home", "work", "billing", "other"];

interface EditAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  /** If provided, edit this address; otherwise add new */
  address: ContactAddress | null;
  onSuccess?: () => void;
}

const emptyForm: ContactAddressInsert & { address_line1: string; address_line2: string; city: string; state: string; postal_code: string; country: string; address_type: string } = {
  contact_id: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Australia",
  address_type: "home",
  is_primary: false,
};

export function EditAddressModal({
  open,
  onOpenChange,
  contactId,
  address,
  onSuccess,
}: EditAddressModalProps) {
  const { toast } = useToast();
  const addAddress = useAddContactAddress();
  const updateAddress = useUpdateContactAddress();

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (address) {
      setForm({
        contact_id: address.contact_id,
        address_line1: address.address_line1 ?? "",
        address_line2: address.address_line2 ?? "",
        city: address.city ?? "",
        state: address.state ?? "",
        postal_code: address.postal_code ?? "",
        country: address.country ?? "Australia",
        address_type: address.address_type ?? "home",
        is_primary: address.is_primary ?? false,
      });
    } else if (contactId) {
      setForm({ ...emptyForm, contact_id: contactId });
    }
  }, [address, contactId, open]);

  const isEdit = !!address?.id;

  const handleSubmit = async () => {
    if (!contactId) {
      toast({ title: "Error", description: "No contact selected.", variant: "destructive" });
      return;
    }
    try {
      if (isEdit && address) {
        await updateAddress.mutateAsync({
          id: address.id,
          contact_id: contactId,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          address_type: form.address_type || null,
          is_primary: form.is_primary,
        });
        toast({ title: "Updated", description: "Address updated." });
      } else {
        await addAddress.mutateAsync({
          contact_id: contactId,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          country: form.country || null,
          address_type: form.address_type || null,
          is_primary: form.is_primary,
        });
        toast({ title: "Added", description: "Address added." });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number };
      const isForbidden = err?.status === 403 || (typeof err?.message === "string" && /forbidden|403|policy|row level security/i.test(err.message));
      const description = isForbidden
        ? "Address storage is not available for this account (permissions or schema). You can still set the main address when editing the contact."
        : (err instanceof Error ? err.message : "Failed to save address");
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-popover border-white/10" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit address" : "Add address"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Address line 1</Label>
              <Input
                className="bg-input"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address line 2 (optional)</Label>
              <Input
                className="bg-input"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                placeholder="Unit, suite, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                className="bg-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                className="bg-input"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label>Postal code</Label>
              <Input
                className="bg-input"
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                placeholder="Postal code"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                className="bg-input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.address_type}
                onValueChange={(v) => setForm({ ...form, address_type: v })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="is_primary"
                checked={form.is_primary}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_primary: !!checked })
                }
              />
              <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
                Primary address
              </Label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              addAddress.isPending ||
              updateAddress.isPending ||
              !form.address_line1?.trim()
            }
          >
            {addAddress.isPending || updateAddress.isPending
              ? "Saving..."
              : isEdit
                ? "Update"
                : "Add address"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
