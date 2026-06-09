import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { SETTINGS_NAV, findSettingsNavItem } from "./settingsNav";
import { SettingsSearch } from "./SettingsSearch";
import { filterSettingsNavPaths } from "@/lib/settingsSearchIndex";
import { useSettingsFieldFocus } from "@/hooks/useSettingsFieldFocus";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = findSettingsNavItem(location.pathname);
  const [searchQuery, setSearchQuery] = useState("");
  const matchingPaths = filterSettingsNavPaths(searchQuery);

  useSettingsFieldFocus();

  if (location.hash === "#settings-notifications") {
    return <Navigate to="/settings/notifications" replace />;
  }

  const mobileValue = activeItem?.path ?? "/settings/account";

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description={activeItem?.description ?? "Manage your account and preferences"}
      />

      <SettingsSearch className="mb-6 max-w-md" onQueryChange={setSearchQuery} />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="lg:w-56 shrink-0 lg:sticky lg:top-[calc(60px+1.5rem)]"
        >
          <div className="lg:hidden mb-1">
            <Select value={mobileValue} onValueChange={(path) => navigate(path)}>
              <SelectTrigger className="bg-input w-full">
                <SelectValue placeholder="Choose section" />
              </SelectTrigger>
              <SelectContent>
                {SETTINGS_NAV.map((group) => (
                  <SelectGroup key={group.group}>
                    <SelectLabel>{group.group}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.path} value={item.path}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden lg:block space-y-5">
            {SETTINGS_NAV.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !matchingPaths || matchingPaths.has(item.path),
              );
              if (matchingPaths && visibleItems.length === 0) return null;
              return (
                <div key={group.group}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.group}
                  </p>
                  <ul className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              matchingPaths?.has(item.path) && !isActive && "bg-muted/30",
                            )
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {matchingPaths && matchingPaths.size === 0 ? (
              <p className="px-3 text-xs text-muted-foreground">No sections match your search.</p>
            ) : null}
          </div>
        </nav>

        <div className="min-w-0 flex-1 max-w-3xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
