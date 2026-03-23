import * as React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Palette, Sun, Moon, Droplets, Ghost, Github, Atom, Sunset, Calendar, Mail, MessageSquare, Snowflake, Coffee, Contrast, Sparkles, Leaf, Waves, Flame, Mountain, Wind, Flower2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, Density } from "@/contexts/ThemeContext";
import { useUserReminderPreferences, useUpsertUserReminderPreferences } from "@/hooks/useUserReminderPreferences";
import { toast } from "sonner";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType; desc?: string }[] = [
  { value: "dark", label: "Dark", icon: Moon, desc: "Default dark theme." },
  { value: "light", label: "Light", icon: Sun, desc: "Light theme for better visibility." },
  { value: "tomorrowNightBlue", label: "Tomorrow Night Blue", icon: Droplets, desc: "Blue-tinted dark theme (VS Code)." },
  { value: "dracula", label: "Dracula", icon: Ghost, desc: "Purple & pink accents." },
  { value: "monokai", label: "Monokai", icon: Palette, desc: "Teal & orange (Sublime Text)." },
  { value: "githubDark", label: "GitHub Dark", icon: Github, desc: "Near-black with blue accents." },
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
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme, density, setDensity } = useTheme();
  const { data: reminderPrefs, isSuccess: reminderPrefsLoaded } = useUserReminderPreferences();
  const upsertReminder = useUpsertUserReminderPreferences();
  const reminderPrefsSeeded = React.useRef(false);

  React.useEffect(() => {
    if (!user || !reminderPrefsLoaded || reminderPrefs !== null || reminderPrefsSeeded.current) return;
    reminderPrefsSeeded.current = true;
    upsertReminder.mutate({ digest_enabled: true, digest_frequency: "daily" });
  }, [user, reminderPrefsLoaded, reminderPrefs]);

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
                  {THEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
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
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your theme and density preferences are saved automatically and will persist across sessions.
              </p>
            </div>
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
            <div className="flex items-start gap-3 pt-2 border-t border-border">
              <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">SMS</p>
                <p className="text-xs text-muted-foreground">Send SMS from Contact detail. Use Mobile Message (Australia) or Twilio: set Edge Function secrets for send-sms. See docs/MOBILE_MESSAGE_SETUP.md or docs/SMS_SETUP.md.</p>
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

        {/* Notifications */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Appointment reminders</p>
                <p className="text-xs text-muted-foreground">Get reminded before appointments</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
