import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Calendar,
  Cake,
  Flame,
  Home,
  ListTodo,
  Mail,
  Workflow,
} from "lucide-react";
import { isToday, isYesterday } from "date-fns";
import type { AppNotification } from "@/hooks/useNotifications";

export function notificationKindIcon(kind: string): LucideIcon {
  const k = kind.toLowerCase();
  if (k.includes("task") || k.includes("overdue")) return ListTodo;
  if (k.includes("nurture")) return Mail;
  if (k.includes("birthday")) return Cake;
  if (k.includes("listing") || k.includes("stage")) return Home;
  if (k.includes("lead") || k.includes("hot") || k.includes("score")) return Flame;
  if (k.includes("digest")) return Bell;
  if (k.includes("workflow")) return Workflow;
  if (k.includes("touch") || k.includes("stale")) return Calendar;
  return Bell;
}

/** Keeps newest-first order; consecutive items share a section heading. */
export function groupNotificationsForDrawer(
  items: AppNotification[],
): { heading: string; items: AppNotification[] }[] {
  const sorted = [...items].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const groups: { heading: string; items: AppNotification[] }[] = [];
  for (const n of sorted) {
    const d = new Date(n.created_at);
    const heading = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : "Earlier";
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.items.push(n);
    else groups.push({ heading, items: [n] });
  }
  return groups;
}
