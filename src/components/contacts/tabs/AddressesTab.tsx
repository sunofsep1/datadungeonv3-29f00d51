import { useState } from "react";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useContactAddresses,
  useUpdateContactAddress,
  useDeleteContactAddress,
  type ContactAddress,
} from "@/hooks/useContactAddresses";
import { useToast } from "@/hooks/use-toast";
import { EditAddressModal } from "../modals/EditAddressModal";

function formatAddress(a: ContactAddress): string {
  const parts = [
    a.address_line1,
    a.address_line2,
    [a.city, a.state].filter(Boolean).join(" "),
    a.postal_code,
    a.country,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

interface AddressesTabProps {
  contactId: string | null;
}

export function AddressesTab({ contactId }: AddressesTabProps) {
  const { toast } = useToast();
  const { data: addresses = [], isLoading } = useContactAddresses(contactId);
  const updateAddress = useUpdateContactAddress();
  const deleteAddress = useDeleteContactAddress();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ContactAddress | null>(null);

  const handleSetPrimary = async (address: ContactAddress) => {
    if (!contactId) return;
    try {
      const othersPrimary = addresses.filter((a) => a.id !== address.id && a.is_primary);
      for (const a of othersPrimary) {
        await updateAddress.mutateAsync({
          id: a.id,
          contact_id: contactId,
          is_primary: false,
        });
      }
      await updateAddress.mutateAsync({
        id: address.id,
        contact_id: contactId,
        is_primary: true,
      });
      toast({ title: "Updated", description: "Primary address set." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (address: ContactAddress) => {
    if (!contactId) return;
    try {
      await deleteAddress.mutateAsync({ id: address.id, contact_id: contactId });
      toast({ title: "Removed", description: "Address deleted." });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const openAdd = () => {
    setEditingAddress(null);
    setEditModalOpen(true);
  };

  const openEdit = (address: ContactAddress) => {
    setEditingAddress(address);
    setEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="py-4 space-y-3">
        <div className="h-16 bg-white/5 rounded animate-pulse" />
        <div className="h-16 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Addresses
        </h3>
        <Button variant="outline" size="sm" className="gap-1 h-8" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-white/10 bg-white/5">
          <MapPin className="w-10 h-10 mx-auto mb-2 text-white/40" />
          <p className="text-sm text-white/60 mb-3">No addresses</p>
          <Button variant="outline" size="sm" className="gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add address
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <Card key={a.id} className="p-4 border-white/10 bg-white/5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{formatAddress(a)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {a.address_type && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {a.address_type}
                      </Badge>
                    )}
                    {a.is_primary && (
                      <Badge variant="outline" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!a.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleSetPrimary(a)}
                      disabled={updateAddress.isPending}
                    >
                      Set primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(a)}
                    aria-label="Edit address"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a)}
                    disabled={deleteAddress.isPending}
                    aria-label="Delete address"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditAddressModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        contactId={contactId}
        address={editingAddress}
        onSuccess={() => setEditingAddress(null)}
      />
    </div>
  );
}
