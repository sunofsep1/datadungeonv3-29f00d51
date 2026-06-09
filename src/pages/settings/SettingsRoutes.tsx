import { Routes, Route, Navigate } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { ExperienceSettings } from "@/components/settings/ExperienceSettings";
import { BusinessSettings } from "@/components/settings/BusinessSettings";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";
import { CommunicationsSettings } from "@/components/settings/CommunicationsSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { AutomationsSettings } from "@/components/settings/AutomationsSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to="account" replace />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="appearance" element={<AppearanceSettings />} />
        <Route path="experience" element={<ExperienceSettings />} />
        <Route path="business" element={<BusinessSettings />} />
        <Route path="notifications" element={<NotificationsSettings />} />
        <Route path="communications" element={<CommunicationsSettings />} />
        <Route path="integrations" element={<IntegrationsSettings />} />
        <Route path="automations" element={<AutomationsSettings />} />
        <Route path="data" element={<DataSettings />} />
        <Route path="security" element={<SecuritySettings />} />
      </Route>
    </Routes>
  );
}
