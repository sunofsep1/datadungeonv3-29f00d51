import type { DrakoAnchor, DrakoMood } from "./types";

/** Default dock position when entering a route (pages can override with useDrako). */
export interface DrakoRouteHome {
  anchor: DrakoAnchor;
  mood: DrakoMood;
  caption?: string;
}

/** Drako's home — centre-stage in the main content area, below the header. */
const HOME: DrakoRouteHome = { anchor: "stage", mood: "idle" };

/**
 * Where Drako lives on each major screen when you land.
 * Event hooks (task done, deal sold) still call moveTo/setMood on top of this.
 */
export const DRAKO_ROUTE_HOME: Record<string, DrakoRouteHome> = {
  "/dashboard": HOME,
  "/attention-hub": HOME,
  "/contacts": HOME,
  "/tasks": { anchor: "stage", mood: "working" },
  "/todos": { anchor: "stage", mood: "working" },
  "/listings": { anchor: "stage", mood: "growth-chart" },
  "/pipeline": { anchor: "stage", mood: "growth-chart" },
  "/nurture": { anchor: "stage", mood: "teacher" },
  "/calendar": { anchor: "stage", mood: "thinking" },
  "/appointments": { anchor: "stage", mood: "thinking" },
  "/lair": { anchor: "stage", mood: "wave" },
  "/training": { anchor: "stage", mood: "teacher" },
};

export function drakoRouteHome(pathname: string): DrakoRouteHome {
  if (DRAKO_ROUTE_HOME[pathname]) return DRAKO_ROUTE_HOME[pathname];
  if (pathname.startsWith("/contacts/")) return { anchor: "stage", mood: "pointing" };
  if (pathname.startsWith("/listings/")) return { anchor: "stage", mood: "working" };
  return HOME;
}
