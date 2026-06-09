import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpsertUserProfile } from "@/hooks/useUserProfile";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import { toast } from "sonner";

export function AccountSettings() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const upsertProfile = useUpsertUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("week");

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPhone(profile.phone ?? "");
    setAgencyName(profile.agency_name ?? "");
    setLicenseNumber(profile.license_number ?? "");
    setCalendarView(profile.default_calendar_view ?? "week");
  }, [profile]);

  const handleSave = () => {
    upsertProfile.mutate(
      {
        display_name: displayName.trim(),
        phone: phone.trim(),
        agency_name: agencyName.trim(),
        license_number: licenseNumber.trim(),
        default_calendar_view: calendarView,
      },
      {
        onSuccess: () => toast.success("Profile saved"),
        onError: () => toast.error("Could not save profile"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="My Account"
        description="Profile details used across the CRM."
        icon={User}
      />
      <Card className="zoho-card p-6 border-border">
        <div className="space-y-4">
          <div id="profile-photo" className="scroll-mt-24">
            <ProfilePhotoUpload
              displayName={displayName}
              avatarUrl={profile?.avatar_url ?? null}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              placeholder="Your name"
              className="bg-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="04xx xxx xxx"
              className="bg-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency">Agency / office</Label>
            <Input
              id="agency"
              placeholder="Agency name"
              className="bg-input"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license">License number</Label>
            <Input
              id="license"
              placeholder="Queensland RE agent licence"
              className="bg-input"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div id="calendar-view" className="space-y-2 max-w-xs scroll-mt-24">
            <Label>Default calendar view</Label>
            <Select value={calendarView} onValueChange={(v) => setCalendarView(v as typeof calendarView)}>
              <SelectTrigger className="bg-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleSave} disabled={upsertProfile.isPending || isLoading}>
            {upsertProfile.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
