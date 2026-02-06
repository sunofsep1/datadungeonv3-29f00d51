import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Sun, Moon, Droplets, Ghost, Github, Atom, Sunset } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType; desc?: string }[] = [
  { value: "dark", label: "Dark", icon: Moon, desc: "Default dark theme." },
  { value: "light", label: "Light", icon: Sun, desc: "Light theme for better visibility." },
  { value: "tomorrowNightBlue", label: "Tomorrow Night Blue", icon: Droplets, desc: "Blue-tinted dark theme (VS Code)." },
  { value: "dracula", label: "Dracula", icon: Ghost, desc: "Purple & pink accents." },
  { value: "monokai", label: "Monokai", icon: Palette, desc: "Teal & orange (Sublime Text)." },
  { value: "githubDark", label: "GitHub Dark", icon: Github, desc: "Near-black with blue accents." },
  { value: "oneDark", label: "One Dark", icon: Atom, desc: "Atom / One Dark Pro style." },
  { value: "solarizedDark", label: "Solarized Dark", icon: Sunset, desc: "Dark teal background." },
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

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
            <div className="p-4 bg-secondary rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your theme preference is saved automatically and will persist across sessions.
              </p>
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
