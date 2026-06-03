import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Calendar, MessageSquare, Clock } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useAppointments } from "@/hooks/useAppointments";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type RecentItem = {
  id: string;
  type: "contact" | "appointment";
  title: string;
  subtitle: string;
  time: string;
  date: Date;
  link: string;
};

export default function Recent() {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();

  const recentItems = useMemo((): RecentItem[] => {
    const items: RecentItem[] = [];
    contacts.slice(0, 20).forEach((c) => {
      items.push({
        id: `contact-${c.id}`,
        type: "contact",
        title: c.name,
        subtitle: "Contact added",
        time: formatDistanceToNow(new Date(c.created_at), { addSuffix: true }),
        date: new Date(c.created_at),
        link: `/contacts/${c.id}`,
      });
    });
    appointments.slice(0, 20).forEach((a) => {
      items.push({
        id: `appointment-${a.id}`,
        type: "appointment",
        title: a.title,
        subtitle: a.location ? `at ${a.location}` : "Appointment",
        time: formatDistanceToNow(new Date(a.date), { addSuffix: true }),
        date: new Date(a.date),
        link: "/appointments",
      });
    });
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30);
  }, [contacts, appointments]);

  const isLoading = contactsLoading || appointmentsLoading;

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Recent" description="Latest activity" />
        <div className="space-y-2 mt-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader
        title="Recent"
        description="Recent contacts and appointments"
      />
      {recentItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">No recent activity yet.</p>
          <Button variant="default" onClick={() => navigate("/contacts")}>
            Add contact
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {recentItems.map((item) => (
            <Card
              key={item.id}
              className="p-3 border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer zoho-card"
              onClick={() => navigate(item.link)}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.type === "contact" ? (
                    <Users className="w-4 h-4 text-primary" />
                  ) : (
                    <Calendar className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.time}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
