import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDrako } from "./DrakoContext";
import { drakoRouteHome } from "./drakoRouteHome";
import { useGameMode } from "@/hooks/useGameMode";

/** Positions the floating companion when you navigate — pages can override via useDrako(). */
export function DrakoBoot() {
  const { pathname } = useLocation();
  const { show, moveTo } = useDrako();
  const { gameModeEnabled } = useGameMode();

  useEffect(() => {
    if (!gameModeEnabled || pathname.startsWith("/lair")) return;
    const home = drakoRouteHome(pathname);
    show();
    moveTo(home.anchor);
  }, [pathname, show, moveTo, gameModeEnabled]);

  return null;
}
