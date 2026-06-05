import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Flame } from "lucide-react";
import { useGameMode } from "@/hooks/useGameMode";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

export function ExperienceSettings() {
  const { gameModeEnabled, setGameModeEnabled, drakoAudioEnabled, setDrakoAudioEnabled } = useGameMode();

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Experience"
        description="Optional game layer and Drako features."
        icon={Flame}
      />
      <Card className="zoho-card p-6 border-border">
        <div className="space-y-4">
          <div id="game-mode" className="flex items-center justify-between gap-4 scroll-mt-24">
            <div className="space-y-1">
              <Label htmlFor="game-mode-switch">Game mode</Label>
              <p className="text-xs text-muted-foreground">
                Drako, XP, quests, and the Lair — turn off for a plain CRM.
              </p>
            </div>
            <Switch id="game-mode-switch" checked={gameModeEnabled} onCheckedChange={setGameModeEnabled} />
          </div>
          <div id="drako-audio" className="flex items-center justify-between gap-4 scroll-mt-24">
            <div className="space-y-1">
              <Label htmlFor="drako-audio-switch">Drako voice</Label>
              <p className="text-xs text-muted-foreground">
                Play clip audio in the Lair (speech bubbles always show).
              </p>
            </div>
            <Switch
              id="drako-audio-switch"
              checked={drakoAudioEnabled}
              disabled={!gameModeEnabled}
              onCheckedChange={setDrakoAudioEnabled}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
