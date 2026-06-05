import type { LucideIcon } from "lucide-react";
import {
  User,
  Palette,
  Gamepad2,
  ShieldCheck,
  Building2,
  MessageSquare,
  Bell,
  Plug,
  Workflow,
  Database,
} from "lucide-react";

export type SettingsNavItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  description?: string;
};

export type SettingsNavGroup = {
  group: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    group: "Personal",
    items: [
      { label: "My Account", path: "/settings/account", icon: User, description: "Profile and agent details" },
      { label: "Appearance", path: "/settings/appearance", icon: Palette, description: "Theme, density, and font size" },
      { label: "Experience", path: "/settings/experience", icon: Gamepad2, description: "Game mode and Drako" },
      { label: "Security", path: "/settings/security", icon: ShieldCheck, description: "Password and sessions" },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Business Defaults", path: "/settings/business", icon: Building2, description: "Commission and defaults" },
      { label: "Communications", path: "/settings/communications", icon: MessageSquare, description: "SMS signature and email" },
      { label: "Notifications", path: "/settings/notifications", icon: Bell, description: "Digest and reminders" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Integrations", path: "/settings/integrations", icon: Plug, description: "Calendar, webhooks, and CRM" },
      { label: "Automations", path: "/settings/automations", icon: Workflow, description: "Listing stages and workflows" },
      { label: "Data", path: "/settings/data", icon: Database, description: "Import, export, and health" },
    ],
  },
];

export const SETTINGS_NAV_ITEMS = SETTINGS_NAV.flatMap((g) => g.items);

export function findSettingsNavItem(pathname: string): SettingsNavItem | undefined {
  return SETTINGS_NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}
