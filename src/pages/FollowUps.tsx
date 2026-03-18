import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useFollowUpByTemperature, type ContactDueForFollowUp } from "@/hooks/useFollowUpReminders";
import { getPrimaryEmail, getPrimaryPhone, getTagNames } from "@/hooks/useContacts";
import { getInitials } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { Phone, Mail, ChevronRight, Users, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function getStatusVariant(status: string | null) {
  switch (status) {
    case "hot": return "hot";
    case "warm": return "warm";
    case "cold": return "cold";
    default: return "entered";
  }
}

function ContactDueCard({ c, onClick }: { c: ContactDueForFollowUp; onClick: () => void }) {
  const primaryPhone = getPrimaryPhone(c);
  const primaryEmail = getPrimaryEmail(c);
  const tagNames = getTagNames(c);
  const initials = getInitials(undefined, undefined, c.name);
  const dueLabel = c.due
    ? (c.daysUntilDue != null && c.daysUntilDue > 0 ? `${c.daysUntilDue} day${c.daysUntilDue === 1 ? "" : "s"} overdue` : "Due today")
    : format(c.nextFollowUpAt, "d MMM yyyy");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer zoho-card"
    >
      <AvatarCircle name={c.name} initials={initials} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{c.name ?? "—"}</span>
          <StatusBadge variant={getStatusVariant(c.status)} className="text-xs">
            {c.temperature}
          </StatusBadge>
          <span className={`text-xs ${c.due ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <Clock className="w-3 h-3 inline mr-0.5" />
            {dueLabel}
          </span>
          {tagNames.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {tagNames.slice(0, 2).map((t) => (
                <span key={t} className="text-[10px] bg-secondary px-1.5 py-0 rounded">{t}</span>
              ))}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-muted-foreground">
          {primaryPhone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {formatPhoneDisplay(primaryPhone)}
            </span>
          )}
          {primaryEmail && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 shrink-0" />
              {primaryEmail}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

function Section({
  title,
  contacts,
  onContactClick,
}: {
  title: string;
  contacts: ContactDueForFollowUp[];
  onContactClick: (id: string) => void;
}) {
  if (contacts.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
        {title}
        <span className="text-muted-foreground font-normal">({contacts.length})</span>
      </h3>
      <div className="space-y-1.5">
        {contacts.map((c) => (
          <ContactDueCard key={c.id} c={c} onClick={() => onContactClick(c.id)} />
        ))}
      </div>
    </div>
  );
}

export default function FollowUps() {
  const navigate = useNavigate();
  const { data: contacts, isLoading } = useContacts();
  const { hot, warm, cold } = useFollowUpByTemperature(contacts);
  const hotDue = hot.filter((c) => c.due);
  const warmDue = warm.filter((c) => c.due);
  const coldDue = cold.filter((c) => c.due);
  const dueCount = hotDue.length + warmDue.length + coldDue.length;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Follow-ups" description="Contacts due for a touch point" />
        <div className="space-y-4 mt-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Follow-ups"
        description={
          dueCount === 0
            ? "No contacts due right now. Set status (hot/warm/cold) and log calls or emails to trigger reminders."
            : `${dueCount} contact${dueCount !== 1 ? "s" : ""} due for follow-up (hot: weekly, warm: 2 weeks, cold: 3 months).`
        }
      />

      {dueCount === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">
            {!contacts?.length
              ? "No contacts yet. Add contacts and set their status (hot/warm/cold) to get reminders."
              : "No one is due for follow-up right now. Log a call or email on a contact to set their next follow-up date."}
          </p>
          <Button variant="default" onClick={() => navigate("/contacts")}>
            Go to Contacts
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          <Section title="Hot (call weekly)" contacts={hotDue} onContactClick={(id) => navigate(`/contacts/${id}`)} />
          <Section title="Warm (call every 2 weeks)" contacts={warmDue} onContactClick={(id) => navigate(`/contacts/${id}`)} />
          <Section title="Cold (call every 3 months)" contacts={coldDue} onContactClick={(id) => navigate(`/contacts/${id}`)} />
        </div>
      )}
    </div>
  );
}
