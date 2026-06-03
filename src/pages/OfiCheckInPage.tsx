import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Home, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

type OfiPreview = {
  inspection_id: string;
  listing_id: string;
  listing_address: string;
  starts_at: string;
  ends_at: string;
};

export default function OfiCheckInPage() {
  const { token } = useParams<{ token: string }>();
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [interestLevel, setInterestLevel] = useState("warm");
  const [workingWithAgent, setWorkingWithAgent] = useState(false);
  const [done, setDone] = useState(false);

  const preview = useQuery({
    queryKey: ["ofi_check_in_preview", token ?? ""],
    queryFn: async (): Promise<OfiPreview | null> => {
      if (!token?.trim()) return null;
      const { data, error } = await supabase.rpc("get_ofi_check_in_by_token", { p_token: token.trim() });
      if (error) throw new Error(supabaseErrorMessage(error));
      const row = Array.isArray(data) ? data[0] : data;
      return (row as OfiPreview) ?? null;
    },
    enabled: !!token?.trim(),
    retry: false,
  });

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!token?.trim()) throw new Error("Invalid check-in link");
      const name = guestName.trim();
      if (!name) throw new Error("Please enter your name");
      const { error } = await supabase.rpc("ofi_check_in_attendee", {
        p_token: token.trim(),
        p_guest_name: name,
        p_guest_phone: guestPhone.trim() || undefined,
        p_guest_email: guestEmail.trim() || undefined,
        p_interest_level: interestLevel,
        p_working_with_agent: workingWithAgent,
      });
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: () => setDone(true),
  });

  if (!token?.trim()) {
    return <OfiShell message="This check-in link is invalid." />;
  }

  if (preview.isLoading) {
    return (
      <OfiShell>
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      </OfiShell>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <OfiShell message={preview.error instanceof Error ? preview.error.message : "This inspection is not available for check-in."} />
    );
  }

  const info = preview.data;
  const whenLabel = `${format(new Date(info.starts_at), "EEE d MMM yyyy")} · ${format(new Date(info.starts_at), "h:mm a")} – ${format(new Date(info.ends_at), "h:mm a")}`;

  if (done) {
    return (
      <OfiShell>
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <CardTitle>You're checked in</CardTitle>
            <CardDescription>Thanks for visiting {info.listing_address || "this property"}.</CardDescription>
          </CardHeader>
        </Card>
      </OfiShell>
    );
  }

  return (
    <OfiShell>
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Home className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Open inspection</span>
          </div>
          <CardTitle className="text-xl leading-snug">{info.listing_address || "Property inspection"}</CardTitle>
          <CardDescription>{whenLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              checkIn.mutate();
            }}
          >
            <div>
              <Label htmlFor="guest-name">Your name *</Label>
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <Label htmlFor="guest-phone">Mobile</Label>
              <Input
                id="guest-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="04xx xxx xxx"
                className="mt-1"
                autoComplete="tel"
              />
            </div>
            <div>
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="interest-level">Interest level</Label>
              <Select value={interestLevel} onValueChange={setInterestLevel}>
                <SelectTrigger id="interest-level" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot — very interested</SelectItem>
                  <SelectItem value="warm">Warm — considering</SelectItem>
                  <SelectItem value="cold">Cold — early stage</SelectItem>
                  <SelectItem value="not_interested">Not interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="working-with-agent"
                checked={workingWithAgent}
                onCheckedChange={(v) => setWorkingWithAgent(v === true)}
              />
              <Label htmlFor="working-with-agent" className="font-normal cursor-pointer">
                I am already working with an agent
              </Label>
            </div>
            {checkIn.isError && (
              <p className="text-sm text-destructive">{checkIn.error instanceof Error ? checkIn.error.message : "Check-in failed"}</p>
            )}
            <Button type="submit" className="w-full" disabled={checkIn.isPending}>
              {checkIn.isPending ? "Checking in…" : "Check in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </OfiShell>
  );
}

function OfiShell({ children, message }: { children?: ReactNode; message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex items-center justify-center p-4">
      {message ? (
        <Card className="w-full max-w-md border-border p-6 text-center">
          <p className="text-muted-foreground">{message}</p>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}
