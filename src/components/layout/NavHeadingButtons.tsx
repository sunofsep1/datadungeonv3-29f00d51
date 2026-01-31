import { Link, useLocation } from "react-router-dom";
import { Flame, Clock, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavHeadingButtonsProps {
  hotLeadsCount: number;
  recentCount: number;
  tasksCount: number;
}

export function NavHeadingButtons({
  hotLeadsCount,
  recentCount,
  tasksCount,
}: NavHeadingButtonsProps) {
  const location = useLocation();

  const links = [
    { path: "/hot-leads", label: "Hot Leads", count: hotLeadsCount, icon: Flame },
    { path: "/recent", label: "Recent", count: recentCount, icon: Clock },
    { path: "/tasks", label: "Tasks", count: tasksCount, icon: CheckSquare },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map(({ path, label, count, icon: Icon }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BCD4] focus:ring-offset-2 focus:ring-offset-[#2c2c2c]",
              isActive
                ? "bg-[#00BCD4] text-[#1a1a1a]"
                : "bg-white/10 text-white/90 hover:bg-white/15 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-xs font-medium",
                  isActive ? "bg-[#1a1a1a]/30" : "bg-white/15"
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
