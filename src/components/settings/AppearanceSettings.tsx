import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { Theme, Density, FontSize } from "@/contexts/ThemeContext";
import { SettingsSectionHeader } from "./SettingsSectionHeader";
import {
  THEME_OPTIONS,
  LIGHT_THEME_VALUES,
  MIDDAY_THEME_VALUES,
  DARK_THEME_VALUES,
  GREG_TOP_RETRO_DARK_THEMES,
  DENSITY_OPTIONS,
  FONT_SIZE_OPTIONS,
} from "./settingsThemeOptions";

export function AppearanceSettings() {
  const { theme, setTheme, density, setDensity, fontSize, setFontSize } = useTheme();

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Appearance"
        description="Theme, density, and readability preferences."
        icon={Palette}
      />
      <Card className="zoho-card p-6 border-border">
        <div className="space-y-4">
          <div id="theme" className="space-y-2 scroll-mt-24">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger className="bg-input w-full max-w-[280px]">
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
                  {THEME_OPTIONS.filter((opt) => DARK_THEME_VALUES.includes(opt.value))
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
          <div id="density" className="space-y-2 scroll-mt-24">
            <Label>Density</Label>
            <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
              <SelectTrigger className="bg-input w-full max-w-[280px]">
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
          <div id="font-size" className="space-y-2 scroll-mt-24">
            <Label>Font size</Label>
            <Select value={fontSize} onValueChange={(v) => setFontSize(v as FontSize)}>
              <SelectTrigger className="bg-input w-full max-w-[280px]">
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
    </div>
  );
}
