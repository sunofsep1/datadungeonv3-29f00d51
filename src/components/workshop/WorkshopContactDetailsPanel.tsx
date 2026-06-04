import { Link } from "react-router-dom";
import { Building2, ExternalLink, Mail, MapPin, MessageSquare, Phone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatContactAddress,
  getAllEmails,
  getAllPhones,
  getContactDisplayName,
  type ContactWithMeta,
} from "@/hooks/useContacts";
import { formatPropertyAddress, useProperties } from "@/hooks/useProperties";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useMemo } from "react";

type Props = {
  contactId: string;
  contact: ContactWithMeta;
  onEmail: () => void;
  onSms: (phone: string) => void;
  nurtureFocus?: boolean;
};

export function WorkshopContactDetailsPanel({
  contactId,
  contact,
  onEmail,
  onSms,
  nurtureFocus,
}: Props) {
  const { data: allProperties = [] } = useProperties();
  const displayName = getContactDisplayName(contact);
  const emails = getAllEmails(contact);
  const phones = getAllPhones(contact);
  const mailingAddress = formatContactAddress(contact);

  const linkedProperties = useMemo(() => {
    if (!contact.contact_property_links?.length) return [];
    return contact.contact_property_links
      .map((link) => {
        const property = allProperties.find((p) => p.id === link.property_id);
        return property ? { ...link, property } : null;
      })
      .filter(Boolean) as Array<
      NonNullable<(typeof contact.contact_property_links)[number]> & {
        property: (typeof allProperties)[number];
      }
    >;
  }, [allProperties, contact.contact_property_links]);

  const primaryPhone = phones[0]?.value ?? null;
  const primaryEmail = emails[0]?.value ?? null;

  return (
    <Card className="zoho-card border-border p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            Contact details
          </p>
          <p className="mt-1 truncate text-base font-semibold text-foreground">{displayName}</p>
          {contact.company_name ? (
            <p className="truncate text-xs text-muted-foreground">{contact.company_name}</p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" asChild>
          <Link to={`/contacts/${contactId}${nurtureFocus ? "?nurtureFocus=1" : ""}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            Full profile
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {primaryEmail ? (
          <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" onClick={onEmail}>
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
        ) : null}
        {primaryPhone ? (
          <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" onClick={() => onSms(primaryPhone)}>
            <MessageSquare className="h-3.5 w-3.5" />
            SMS
          </Button>
        ) : null}
      </div>

      <Separator className="my-3" />

      <div className="space-y-3 text-sm">
        {emails.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Email</p>
            <ul className="space-y-1">
              {emails.map((row) => (
                <li key={row.value}>
                  <a
                    href={`mailto:${encodeURIComponent(row.value)}`}
                    className="inline-flex items-center gap-2 text-foreground hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="break-all">{row.value}</span>
                    {row.label ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {row.label}
                      </Badge>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No email on file.</p>
        )}

        {phones.length > 0 ? (
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Phone</p>
            <ul className="space-y-1">
              {phones.map((row) => (
                <li key={`${row.label}-${row.value}`}>
                  <a
                    href={`tel:${row.value.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 text-foreground hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{formatPhoneDisplay(row.value)}</span>
                    {row.label ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {row.label}
                      </Badge>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No phone on file.</p>
        )}

        {mailingAddress !== "—" ? (
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Contact address</p>
            <p className="flex items-start gap-2 text-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm leading-snug">{mailingAddress}</span>
            </p>
          </div>
        ) : null}

        {linkedProperties.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Linked properties</p>
            <ul className="space-y-2">
              {linkedProperties.map((link) => {
                const addr = formatPropertyAddress(link.property);
                return (
                  <li key={link.id}>
                    <Link
                      to={`/properties/${link.property_id}`}
                      className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/20 px-2.5 py-2 transition-colors hover:bg-accent/40"
                    >
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{addr || "Property"}</span>
                        {link.role ? (
                          <span className="text-[11px] capitalize text-muted-foreground">{link.role.replace(/_/g, " ")}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No linked properties — open full profile to link one.</p>
        )}
      </div>
    </Card>
  );
}
