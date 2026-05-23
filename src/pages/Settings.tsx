import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Palette, Sun, Moon, Droplets, Ghost, Code2, Atom, Sunset, Calendar, Mail, MessageSquare, Snowflake, Coffee, Contrast, Sparkles, Leaf, Waves, Flame, Mountain, Wind, Flower2, ExternalLink, Workflow } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, Density, FontSize } from "@/contexts/ThemeContext";
import { Textarea } from "@/components/ui/textarea";
import { useUserReminderPreferences, useUpsertUserReminderPreferences } from "@/hooks/useUserReminderPreferences";
import { useUserCommunicationSettings, useUpsertUserCommunicationSettings } from "@/hooks/useUserCommunicationSettings";
import { useCommissionRate } from "@/hooks/useCommissionRate";
import { toast } from "sonner";
import { ActivityScheduleBuilderCard } from "@/components/settings/ActivityScheduleBuilderCard";
import { ListingStageAutomationCard } from "@/components/settings/ListingStageAutomationCard";
import { InboundLeadWebhookHelp } from "@/components/settings/InboundLeadWebhookHelp";
import { LeadCsvImportBlock } from "@/components/settings/LeadCsvImportBlock";
import { OperationsEdgeIndex } from "@/components/settings/OperationsEdgeIndex";
import { IN_APP_NOTIFICATION_SOURCES } from "@/lib/notificationRules";
const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType; desc?: string }[] = [
  { value: "dark", label: "Dark (Classic)", icon: Moon, desc: "Original dark theme." },
  { value: "darkPlus", label: "Dark+", icon: Moon, desc: "Readable dark theme with brighter surfaces." },
  { value: "light", label: "Light (Classic)", icon: Sun, desc: "Original light theme." },
  { value: "lightPlus", label: "Light+", icon: Sun, desc: "Softer light theme with stronger hierarchy." },
  { value: "midday", label: "Midday", icon: Sun, desc: "Balanced neutral mode between dark and light." },
  { value: "middayCool", label: "Midday Cool", icon: Droplets, desc: "Cool grey-blue midday blend." },
  { value: "middayNeutral", label: "Midday Neutral", icon: Sun, desc: "Balanced neutral gray midday blend." },
  { value: "middayWarm", label: "Midday Warm", icon: Sunset, desc: "Warm stone midday blend." },
  { value: "middayGregSoft", label: "Greg Pick: Soft Midday", icon: Coffee, desc: "Low-glare warm midday for long sessions." },
  { value: "middayGregCrisp", label: "Greg Pick: Crisp Midday", icon: Contrast, desc: "Sharper midday contrast for dense data screens." },
  { value: "latte", label: "Latte", icon: Coffee, desc: "Warm light beige with soft brown accents." },
  { value: "dawn", label: "Dawn", icon: SunriseIcon, desc: "Rosy morning light with gentle contrast." },
  { value: "mint", label: "Mint", icon: Leaf, desc: "Fresh mint light theme with green accents." },
  { value: "sky", label: "Sky", icon: Droplets, desc: "Airy blue light theme with cool tones." },
  { value: "sand", label: "Sand", icon: Sunset, desc: "Soft sand light theme with golden accents." },
  { value: "tomorrowNightBlue", label: "Tomorrow Night Blue", icon: Droplets, desc: "Blue-tinted dark theme (VS Code)." },
  { value: "dracula", label: "Dracula", icon: Ghost, desc: "Purple & pink accents." },
  { value: "monokai", label: "Monokai", icon: Palette, desc: "Teal & orange (Sublime Text)." },
  { value: "githubDark", label: "GitHub Dark", icon: Code2, desc: "Near-black with blue accents." },
  { value: "oneDark", label: "One Dark", icon: Atom, desc: "Atom / One Dark Pro style." },
  { value: "solarizedDark", label: "Solarized Dark", icon: Sunset, desc: "Dark teal background." },
  { value: "nord", label: "Nord", icon: Snowflake, desc: "Cool greys and blues." },
  { value: "catppuccin", label: "Catppuccin Mocha", icon: Coffee, desc: "Soft pastel dark theme." },
  { value: "highContrast", label: "High contrast", icon: Contrast, desc: "Accessibility: strong contrast." },
  { value: "tokyoNight", label: "Tokyo Night", icon: Waves, desc: "Deep indigo, popular editor theme." },
  { value: "gruvbox", label: "Gruvbox Dark", icon: Palette, desc: "Retro warm brown & orange." },
  { value: "rosePine", label: "Rose Pine", icon: Flower2, desc: "Muted evergreen & rose." },
  { value: "synthwave", label: "Synthwave '84", icon: Sparkles, desc: "Retro neon pink & cyan." },
  { value: "ayuMirage", label: "Ayu Mirage", icon: Waves, desc: "Teal-dark with orange accents." },
  { value: "materialPalenight", label: "Material Palenight", icon: Atom, desc: "Material dark purple & cyan." },
  { value: "kanagawa", label: "Kanagawa", icon: Mountain, desc: "Japanese-inspired warm lotus." },
  { value: "oceanicNext", label: "Oceanic Next", icon: Wind, desc: "Deep ocean blue-green." },
  { value: "horizon", label: "Horizon", icon: Flame, desc: "Warm pink & coral accents." },
  { value: "everforest", label: "Everforest", icon: Leaf, desc: "Soft green forest theme." },
  { value: "neonArcade84", label: "Neon Arcade '84", icon: Sparkles, desc: "Retro arcade neon with readable mid-dark contrast." },
  { value: "miamiVice89", label: "Miami Vice '89", icon: Waves, desc: "Teal-magenta evening glow, inspired by late-80s synth style." },
  { value: "vhsAfterglow", label: "VHS Afterglow", icon: Moon, desc: "Dusty purple tape-era palette with soft highlights." },
  { value: "mallsoft95", label: "Mallsoft '95", icon: Sunset, desc: "Muted mauve and teal for a nostalgic 90s desktop feel." },
  { value: "cyberTeal96", label: "Cyber Teal '96", icon: Droplets, desc: "Blue-green cyber tones, crisp but not too dark." },
  { value: "floppyDiskBlue", label: "Floppy Disk Blue", icon: Code2, desc: "Cool cobalt workstation look with gentle contrast." },
  { value: "y2kIce", label: "Y2K Ice", icon: Snowflake, desc: "Frosted chrome-era blues for an early-2000s vibe." },
  { value: "cyberGrape2000", label: "Cyber Grape 2000", icon: Atom, desc: "Purple-plum UI inspired by turn-of-millennium tech." },
  { value: "matrixPastel", label: "Matrix Pastel", icon: Leaf, desc: "Soft green-on-slate that nods to late-90s terminals." },
  { value: "sunsetDrive", label: "Sunset Drive", icon: Flame, desc: "Warm peach and violet twilight dashboard palette." },
  { value: "dotcomSlate", label: "Dotcom Slate", icon: Contrast, desc: "Balanced slate neutrals with bright web-1.0 accents." },
  { value: "gameboyNight", label: "Gameboy Night", icon: Moon, desc: "Retro handheld greens in a modern mid-dark UI." },
  { value: "dreamcastBlue", label: "Dreamcast Blue", icon: Waves, desc: "Cool console-era cyan and orange contrast pops." },
  { value: "millenniumPurple", label: "Millennium Purple", icon: Flower2, desc: "Y2K lavender and indigo with soft readability." },
  { value: "retroWaveDusk", label: "Retrowave Dusk", icon: Sparkles, desc: "80s-inspired dusk gradient tones, mid-dark and vibrant." },
];

const MIDDAY_THEME_VALUES: Theme[] = [
  "midday",
  "middayCool",
  "middayNeutral",
  "middayWarm",
  "middayGregSoft",
  "middayGregCrisp",
];
const LIGHT_THEME_VALUES: Theme[] = ["light", "lightPlus", "latte", "dawn", "mint", "sky", "sand"];
const DARK_THEME_VALUES: Theme[] = THEME_OPTIONS
  .map((opt) => opt.value)
  .filter((value) => !LIGHT_THEME_VALUES.includes(value) && !MIDDAY_THEME_VALUES.includes(value));

const GREG_TOP_RETRO_DARK_THEMES: Theme[] = [
  "neonArcade84",
  "miamiVice89",
  "y2kIce",
  "millenniumPurple",
  "retroWaveDusk",
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
];

export default function Settings() {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme, density, setDensity, fontSize, setFontSize } = useTheme();
  const { commissionRate, setCommissionRate } = useCommissionRate();
  const { data: reminderPrefs, isSuccess: reminderPrefsLoaded } = useUserReminderPreferences();
  const upsertReminder = useUpsertUserReminderPreferences();
  const { data: commSettings } = useUserCommunicationSettings();
  const upsertComm = useUpsertUserCommunicationSettings();
  const [smsSigDraft, setSmsSigDraft] = React.useState("");
  const reminderPrefsSeeded = React.useRef(false);

  React.useEffect(() => {
    if (commSettings) setSmsSigDraft(commSettings.sms_signature ?? "");
  }, [commSettings?.sms_signature, commSettings?.updated_at]);

  React.useEffect(() => {
    if (!user || !reminderPrefsLoaded || reminderPrefs !== null || reminderPrefsSeeded.current) return;
    reminderPrefsSeeded.current = true;
    upsertReminder.mutate({ digest_enabled: true, digest_frequency: "daily" });
  }, [user, reminderPrefsLoaded, reminderPrefs]);

  React.useEffect(() => {
    if (location.hash !== "#settings-notifications") return;
    const el = document.getElementById("settings-notifications");
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.pathname, location.hash]);

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Settings" 
        description="Manage your account and preferences"
      />
      
      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Profile</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input placeholder="Your name" className="bg-input" />
            </div>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                <SelectTrigger className="bg-input w-full max-w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Light Themes</SelectLabel>
                    {THEME_OPTIONS.filter((opt) => LIGHT_THEME_VALUES.includes(opt.value)).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Midday Themes</SelectLabel>
                    {THEME_OPTIONS.filter((opt) => MIDDAY_THEME_VALUES.includes(opt.value)).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Dark Themes</SelectLabel>
                    {THEME_OPTIONS
                      .filter((opt) => DARK_THEME_VALUES.includes(opt.value))
                      .sort((a, b) => {
                        const ai = GREG_TOP_RETRO_DARK_THEMES.indexOf(a.value);
                        const bi = GREG_TOP_RETRO_DARK_THEMES.indexOf(b.value);
                        const aPinned = ai !== -1;
                        const bPinned = bi !== -1;
                        if (aPinned && bPinned) return ai - bi;
                        if (aPinned) return -1;
                        if (bPinned) return 1;
                        return 0;
                      })
                      .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {THEME_OPTIONS.find((o) => o.value === theme)?.desc ?? "Select your preferred theme."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Density</Label>
              <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
                <SelectTrigger className="bg-input w-full max-w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DENSITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Compact reduces spacing and list row height for more content on screen.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Font size</Label>
              <Select value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)}>
                <SelectTrigger className="bg-input w-full max-w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Large increases app text size for easier readability.
              </p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your appearance preferences are saved automatically and will persist across sessions.
              </p>
            </div>
          </div>
        </Card>

        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Business defaults</h3>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="commission-rate">Default commission rate (%)</Label>
            <Input
              id="commission-rate"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="bg-input"
            />
            <p className="text-xs text-muted-foreground">
              Used for Projected GCI in Listings &amp; Sales and Performance.
            </p>
          </div>
        </Card>

        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">SMS signature</h3>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Used automatically in SMS templates as <code className="text-xs">{"{{signature}}"}</code>. Include your name
              and agency so messages meet identification rules (e.g. Spam Act AU). Bulk sends use this value from the
              server when messages go out.
            </p>
            <div className="space-y-2">
              <Label htmlFor="sms-signature">Signature text</Label>
              <Textarea
                id="sms-signature"
                className="bg-input min-h-[88px] text-sm"
                placeholder="e.g. Greg Leigh, Sotheby's International Realty"
                value={smsSigDraft}
                onChange={(e) => setSmsSigDraft(e.target.value)}
                maxLength={280}
              />
              <p className="text-xs text-muted-foreground">{smsSigDraft.length} / 280</p>
            </div>
            <Button
              type="button"
              onClick={() =>
                upsertComm.mutate(
                  { sms_signature: smsSigDraft },
                  {
                    onSuccess: () => toast.success("SMS signature saved"),
                    onError: () => toast.error("Could not save signature"),
                  },
                )
              }
              disabled={upsertComm.isPending}
            >
              {upsertComm.isPending ? "Saving…" : "Save signature"}
            </Button>
          </div>
        </Card>

        {/* Integrations */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Integrations</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">Connect or manage in the Dashboard calendar widget. Appointments can sync to your Google Calendar.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link to="/dashboard">Open Dashboard</Link>
              </Button>
            </div>
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="text-xs text-muted-foreground">Send email from Contact detail or Marketing → Email Campaigns. From address is set in Supabase Edge Function secrets (RESEND_API_KEY, EMAIL_FROM).</p>
              </div>
            </div>
            <InboundLeadWebhookHelp />
            <LeadCsvImportBlock />
            <OperationsEdgeIndex />
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">SMS</p>
                <p className="text-xs text-muted-foreground">
                  Send SMS from Contact detail or bulk SMS from Contacts. Configure send-sms, send-sms-broadcast, and
                  sequence-runner with Mobile Message secrets; add SUPABASE_SERVICE_ROLE_KEY on send-sms for opt-out checks
                  and logging. See docs/MOBILE_MESSAGE_SETUP.md and docs/COMMUNICATION_AUTOMATION_OPS.md.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">Apple Messages for Business</p>
                <p className="text-xs text-muted-foreground">
                  Let customers message your business in the Messages app (iPhone, iPad, Mac). You need an Apple-approved Messaging Service Provider (MSP), who provides the chat platform and can integrate with your CRM.
                </p>
                <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1 mt-2">
                  <li>Register at Apple Business Register and accept Messages for Business terms.</li>
                  <li>Choose an approved MSP from the list Apple shows during registration.</li>
                  <li>Your MSP will connect the Messages channel to their platform and, if supported, to Data Dungeon (CRM) for conversation history and agent tools.</li>
                </ol>
                <p className="text-xs text-muted-foreground">See docs/APPLE_MESSAGES_FOR_BUSINESS.md in the repo for full steps and CRM integration notes.</p>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5" asChild>
                  <a href="https://register.apple.com/messages" target="_blank" rel="noopener noreferrer">
                    Open Apple Business Register <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <ListingStageAutomationCard />

        <ActivityScheduleBuilderCard />

        <Card className="zoho-card p-6 border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Workflow className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">CRM workflows</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Create workflows, enroll contacts, and manage listing triggers from the Automations hub.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/automations">Open Automations</Link>
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card id="settings-notifications" className="zoho-card p-6 border-border scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/15 p-3 space-y-2 mb-6">
            <p className="text-xs font-medium text-foreground">In-app (header bell)</p>
            <p className="text-[11px] text-muted-foreground">
              These appear in the drawer next to your avatar. New rows can arrive in real time; the badge counts unread items.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4 marker:text-muted-foreground/70">
              {IN_APP_NOTIFICATION_SOURCES.map((r) => (
                <li key={r.headline}>
                  <span className="text-foreground/90 font-medium">{r.headline}</span>
                  <span className="text-muted-foreground"> — {r.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            <span className="text-foreground font-medium">Daily digest email</span> is separate: it is an outbound email summary (Resend + cron), not the same list as the bell. Use both if you want inbox backup for follow-ups.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Daily CRM digest email</p>
                <p className="text-xs text-muted-foreground">
                  Summary of contacts due for follow-up and open contact tasks (sent by a scheduled job; requires RESEND_API_KEY on the server).
                </p>
              </div>
              <Switch
                checked={reminderPrefs?.digest_enabled ?? true}
                onCheckedChange={(v) =>
                  upsertReminder.mutate(
                    { digest_enabled: v },
                    {
                      onSuccess: () => toast.success(v ? "Digest enabled" : "Digest off"),
                      onError: () => toast.error("Could not save"),
                    }
                  )
                }
                disabled={upsertReminder.isPending}
              />
            </div>
            <div className="space-y-2 max-w-xs">
              <p className="text-xs text-muted-foreground">Digest frequency (for future use; digest cron runs daily)</p>
              <Select
                value={reminderPrefs?.digest_frequency ?? "daily"}
                onValueChange={(val) =>
                  upsertReminder.mutate(
                    { digest_frequency: val as "daily" | "weekly" },
                    { onSuccess: () => toast.success("Saved"), onError: () => toast.error("Could not save") }
                  )
                }
                disabled={upsertReminder.isPending}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Appointment reminders</p>
                <p className="text-xs text-muted-foreground">
                  Email via Resend when configured. Optional SMS: set secret{" "}
                  <code className="text-[10px]">APPOINTMENT_REMINDER_SMS=true</code> on appointment-reminders plus Mobile
                  Message secrets (same as send-sms).
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SunriseIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 18h16" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M12 4v3" />
      <path d="m5 11 2 2" />
      <path d="m19 11-2 2" />
    </svg>
  );
}
