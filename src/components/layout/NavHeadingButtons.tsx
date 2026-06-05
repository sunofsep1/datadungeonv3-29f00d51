import { Link, useLocation } from "react-router-dom";
import { Sparkles, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavHeadingButtonsProps {
  nurtureDueCount: number;
  tasksCount: number;
}

export function NavHeadingButtons({
  nurtureDueCount,
  tasksCount,
}: NavHeadingButtonsProps) {
  const location = useLocation();

  const links = [
    { path: "/nurture", label: "Nurture", count: nurtureDueCount, icon: Sparkles },
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
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-xs font-medium",
                  isActive ? "bg-primary-foreground/30 text-primary-foreground" : "bg-muted text-muted-foreground"
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
