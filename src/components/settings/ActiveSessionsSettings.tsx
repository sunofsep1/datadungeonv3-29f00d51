import { useState } from "react";
import { format } from "date-fns";
import { Monitor, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ActiveSessionsSettings() {
  const { session, user } = useAuth();
  const [busy, setBusy] = useState<"others" | "global" | null>(null);

  const signOutOthers = async () => {
    setBusy("others");
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out on all other devices");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign out other sessions");
    } finally {
      setBusy(null);
    }
  };

  const signOutEverywhere = async () => {
    setBusy("global");
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign out");
      setBusy(null);
    }
  };

  const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;

  return (
    <Card id="active-sessions" className="zoho-card p-6 border-border space-y-4 scroll-mt-24">
      <div className="flex items-start gap-3">
        <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Active sessions</h3>
          <p className="text-xs text-muted-foreground">
            Supabase does not list every device in the client API. You can sign out other browsers or everywhere below.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/10 p-3 text-xs space-y-1">
        <p className="font-medium text-foreground">This session</p>
        <p className="text-muted-foreground truncate">{user?.email ?? "Signed in"}</p>
        {lastSignIn ? (
          <p className="text-muted-foreground">Last sign-in: {format(lastSignIn, "d MMM yyyy, h:mm a")}</p>
        ) : null}
        {expiresAt ? (
          <p className="text-muted-foreground">Access token refreshes before {format(expiresAt, "d MMM yyyy, h:mm a")}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void signOutOthers()} disabled={busy !== null}>
          {busy === "others" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Sign out other devices
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => void signOutEverywhere()}
          disabled={busy !== null}
        >
          {busy === "global" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Sign out everywhere
        </Button>
      </div>
    </Card>
  );
}
