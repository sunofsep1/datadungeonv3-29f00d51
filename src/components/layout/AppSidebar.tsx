import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { prefetchRoute } from "@/lib/prefetchRoutes";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Megaphone,
  Menu,
  X,
  Database,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  MoreHorizontal,
  Home,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: "Home",
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Client Management",
    defaultOpen: true,
    items: [
      { title: "Contacts", url: "/contacts", icon: Users },
      { title: "Properties", url: "/properties", icon: Home },
      { title: "Calendar", url: "/calendar", icon: Calendar },
    ],
  },
  {
    label: "Business",
    defaultOpen: true,
    items: [
      { title: "Marketing", url: "/marketing", icon: Megaphone },
      { title: "Performance", url: "/performance", icon: BarChart3 },
      { title: "Research", url: "/research", icon: Search },
    ],
  },
];

// Flat list for mobile
const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

const mobileNavItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "More", url: "#more", icon: MoreHorizontal },
];

export function AppSidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.label, g.defaultOpen ?? true]))
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    if (url === "/calendar") return location.pathname.startsWith("/calendar") || location.pathname.startsWith("/appointments");
    if (url === "/properties") return location.pathname.startsWith("/properties");
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden print:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-50 w-[220px] min-h-screen bg-sidebar border-r border-sidebar-border flex-col transition-transform duration-300 print:hidden hidden md:flex"
        )}
      >
        {/* Logo — teal/green to match main page (dashboard clock, KPIs, etc.) */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
              <Database className="w-5 h-5 text-teal-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground/80">DATA</span>
              <span className="text-sm font-bold text-teal">DUNGEON</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {navGroups.map((group) => (
            <Collapsible
              key={group.label}
              open={openGroups[group.label]}
              onOpenChange={() => toggleGroup(group.label)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    openGroups[group.label] ? "" : "-rotate-90"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", active && "text-sidebar-primary")} />
                      <span>{item.title}</span>
                    </NavLink>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <NavLink to="/scripts" onMouseEnter={() => prefetchRoute("/scripts")} onFocus={() => prefetchRoute("/scripts")} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Scripts
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" onMouseEnter={() => prefetchRoute("/settings")} onFocus={() => prefetchRoute("/settings")} className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 mt-1"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Slide-out Menu */}
      <aside
        className={cn(
          "fixed z-50 w-[280px] h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 print:hidden md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-sidebar-border mt-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
              <Database className="w-5 h-5 text-teal-foreground" />
            </div>
            <span className="text-sm font-bold text-teal">DATA DUNGEON</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => {
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                onMouseEnter={() => prefetchRoute(item.url)}
                onFocus={() => prefetchRoute(item.url)}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "text-sidebar-primary")} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
          <div className="pt-4 border-t border-sidebar-border mt-4">
            <NavLink to="/scripts" onMouseEnter={() => prefetchRoute("/scripts")} onFocus={() => prefetchRoute("/scripts")} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <FileText className="w-5 h-5" />
              <span>Scripts</span>
            </NavLink>
            <NavLink to="/settings" onMouseEnter={() => prefetchRoute("/settings")} onFocus={() => prefetchRoute("/settings")} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate mb-2">
            {user?.email}
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border md:hidden print:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            if (item.url === "#more") {
              return (
                <DropdownMenu key={item.title}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-muted-foreground">
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.title}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
                    <DropdownMenuItem asChild>
                      <NavLink to="/marketing" className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Marketing
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/performance" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Performance
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/properties" className="flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Properties
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NavLink to="/scripts" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Scripts
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/settings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Settings
                      </NavLink>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            
            const isActive = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
