import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Clock, FileText, Handshake, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactScriptQuickSheet } from "@/components/contacts/ContactScriptQuickSheet";
import { getDaysSinceLastTouch } from "@/lib/contactLastTouch";
import { openLogTouch } from "@/lib/openLogTouch";
import { useContactTasks } from "@/hooks/useContactTasks";
import type { Tables } from "@/integrations/supabase/types";

type Props = {
  contact: Tables<"contacts">;
  contactId: string;
};

export function ContactQuickActionsBar({ contact, contactId }: Props) {
  const [scriptsOpen, setScriptsOpen] = useState(false);
  const { data: tasks = [] } = useContactTasks(contactId);
  const openTaskCount = tasks.filter((t) => !t.completed_at).length;
  const daysSince = getDaysSinceLastTouch(contact);

  const lastTouch = contact.last_touch_date ? format(new Date(contact.last_touch_date), "d MMM yyyy") : null;
  const nextTouch = contact.next_touch_date ? format(new Date(contact.next_touch_date), "d MMM yyyy") : null;

  return (
    <>
      <Card className="zoho-card border-border px-3 py-2.5 sm:px-4 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => openLogTouch({ contactId })}
            >
              <Handshake className="h-3.5 w-3.5" />
              Log touch
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setScriptsOpen(true)}>
              <FileText className="h-3.5 w-3.5" />
              Scripts
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link to="/tasks">
                <ListTodo className="h-3.5 w-3.5" />
                Tasks
                {openTaskCount > 0 ? (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[10px] tabular-nums">
                    {openTaskCount}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Last <span className="font-medium text-foreground">{lastTouch ?? "—"}</span>
            </span>
            <span>
              Next <span className="font-medium text-foreground">{nextTouch ?? "—"}</span>
            </span>
            {daysSince != null ? (
              <span className="tabular-nums">{daysSince}d since touch</span>
            ) : null}
          </div>
        </div>
      </Card>

      <ContactScriptQuickSheet
        open={scriptsOpen}
        onOpenChange={setScriptsOpen}
        contactCategory={contact.contact_category}
      />
    </>
  );
}
