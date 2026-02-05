import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge, type BadgeVariant } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactDetailPanel } from "@/components/contacts/ContactDetailPanel";
import {
  useContacts,
  type ContactWithMeta,
  getPrimaryEmail,
  getPrimaryPhone,
  getTagNames,
} from "@/hooks/useContacts";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, ChevronRight, Users } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Skeleton } from "@/components/ui/skeleton";

function getStatusVariant(status: string | null): BadgeVariant {
  switch (status) {
    case "hot":
      return "hot";
    case "warm":
      return "warm";
    case "cold":
      return "cold";
    default:
      return "default";
  }
}

export default function HotLeads() {
  const navigate = useNavigate();
  const { data: contacts, isLoading } = useContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const hotLeads = useMemo(() => {
    let list = (contacts ?? []).filter((c) => (c.status ?? "lead") === "hot") as ContactWithMeta[];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) => {
        const email = getPrimaryEmail(c);
        const phone = getPrimaryPhone(c);
        const tagNames = getTagNames(c);
        return (
          c.name.toLowerCase().includes(q) ||
          (email?.toLowerCase().includes(q)) ||
          (phone?.toLowerCase().includes(q)) ||
          tagNames.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [contacts, debouncedSearch]);

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Hot Leads" description="Contacts with hot lead status" />
        <div className="space-y-2 mt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Hot Leads"
        description={`${hotLeads.length} contact${hotLeads.length !== 1 ? "s" : ""} with hot lead status`}
      />
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hot leads..."
          className="pl-10 bg-input h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {hotLeads.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">
            {!contacts?.length
              ? "No contacts yet. Add contacts and set status to Hot."
              : (contacts ?? []).filter((c) => c.status === "hot").length === 0
                ? "No hot leads. Update contact status to Hot on the Contacts page."
                : "No hot leads match your search."}
          </p>
          <Button variant="default" onClick={() => navigate("/contacts")}>
            Go to Contacts
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Showing {hotLeads.length} hot lead{hotLeads.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {hotLeads.map((contact) => {
              const primaryEmail = getPrimaryEmail(contact);
              const primaryPhone = getPrimaryPhone(contact);
              const tagNames = getTagNames(contact);
              const initials = getInitials(
                contact.first_name,
                contact.last_name,
                contact.name
              );
              return (
                <div
                  key={contact.id}
                  className="group flex flex-wrap items-center gap-3 p-2.5 rounded-lg border border-white/10 hover:bg-white/[0.06] transition-all duration-200 cursor-pointer zoho-card"
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <AvatarCircle name={contact.name} initials={initials} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{contact.name}</span>
                      <StatusBadge variant={getStatusVariant(contact.status)}>
                        {contact.status ?? "lead"}
                      </StatusBadge>
                      {tagNames.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {tagNames.slice(0, 3).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs font-normal">
                              {t}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {primaryPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {primaryPhone}
                        </span>
                      )}
                      {primaryEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {primaryEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/50 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </>
      )}
      <ContactDetailPanel
        contactId={selectedContactId}
        open={selectedContactId !== null}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
      />
    </div>
  );
}
