import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateContact } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";

type ContactRow = {
  id: string;
  do_not_contact?: boolean | null;
  dnc_phone?: boolean | null;
  dnc_sms?: boolean | null;
  dnc_email?: boolean | null;
  dnc_mail?: boolean | null;
  email_opt_out?: boolean | null;
  sms_opt_out?: boolean | null;
};

type Props = {
  contact: ContactRow;
  onUpdated?: () => void;
};

export function ContactOutreachPreferences({ contact, onUpdated }: Props) {
  const updateContact = useUpdateContact();
  const { toast } = useToast();

  const patch = async (fields: Partial<ContactRow>) => {
    try {
      await updateContact.mutateAsync({ id: contact.id, ...fields });
      onUpdated?.();
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const c = contact as ContactRow;

  return (
    <Card className="zoho-card p-5 sm:p-6 border-border">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1">Outreach preferences</h3>
      <p className="text-xs text-muted-foreground mb-4">Reapit-style do-not-contact per channel.</p>
      <PrefsWrap>
        <PrefRow
          id="dnc-all"
          label="Do not contact (all channels)"
          checked={c.do_not_contact === true}
          onChange={(v) => void patch({ do_not_contact: v })}
        />
        <PrefRow
          id="dnc-phone"
          label="Do not call"
          checked={c.dnc_phone === true}
          disabled={c.do_not_contact === true}
          onChange={(v) => void patch({ dnc_phone: v })}
        />
        <PrefRow
          id="dnc-sms"
          label="Do not SMS"
          checked={c.dnc_sms === true || c.sms_opt_out === true}
          disabled={c.do_not_contact === true}
          onChange={(v) => void patch({ dnc_sms: v, sms_opt_out: v })}
        />
        <PrefRow
          id="dnc-email"
          label="Do not email"
          checked={c.dnc_email === true || c.email_opt_out === true}
          disabled={c.do_not_contact === true}
          onChange={(v) => void patch({ dnc_email: v, email_opt_out: v })}
        />
        <PrefRow
          id="dnc-mail"
          label="Do not mail"
          checked={c.dnc_mail === true}
          disabled={c.do_not_contact === true}
          onChange={(v) => void patch({ dnc_mail: v })}
        />
      </PrefsWrap>
    </Card>
  );
}

function PrefRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );
}


function PrefsWrap({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
