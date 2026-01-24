import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      <PageHeader 
        title="Settings" 
        description="Manage your account and preferences"
      />
      
      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <Card className="p-6 bg-card border-border">
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

        {/* Notifications */}
        <Card className="p-6 bg-card border-border">
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

        {/* Appearance */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Appearance</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Dark mode</p>
              <p className="text-xs text-muted-foreground">Use dark theme</p>
            </div>
            <Switch defaultChecked />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
