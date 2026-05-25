import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useDrako } from "./DrakoContext";
import { drakoRouteHome } from "./drakoRouteHome";

/** Positions the floating companion when you navigate — pages can override via useDrako(). */
export function DrakoBoot() {
  const { pathname } = useLocation();
  const { show, moveTo } = useDrako();

  useEffect(() => {
    const home = drakoRouteHome(pathname);
    show();
    moveTo(home.anchor, { mood: home.mood, caption: home.caption });
  }, [pathname, show, moveTo]);

  return null;
}
