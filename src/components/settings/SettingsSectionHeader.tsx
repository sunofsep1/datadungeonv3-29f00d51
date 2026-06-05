import type { LucideIcon } from "lucide-react";

type SettingsSectionHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function SettingsSectionHeader({ title, description, icon: Icon }: SettingsSectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon ? <Icon className="h-5 w-5 text-primary shrink-0" /> : null}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
