import * as React from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Palette, Sun, Moon, Droplets, Ghost, Github, Atom, Sunset, Calendar, Mail, MessageSquare, Snowflake, Coffee, Contrast, Sparkles, Leaf, Waves, Flame, Mountain, Wind, Flower2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, Density } from "@/contexts/ThemeContext";

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
          </div>
        </Card>

        {/* Notifications */}
        <Card className="zoho-card p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive email updates about your activity</p>
              </div>
              <Switch />
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

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
