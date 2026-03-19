import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  PanelLeftClose,
  PanelLeft,
  Building2,
  PhoneCall,
  ListTodo,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { layout } from "@/lib/designTokens";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const homeItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const clientManagementItems: NavItem[] = [
  { title: "To-Do", url: "/todos", icon: ListTodo },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Follow-ups", url: "/follow-ups", icon: PhoneCall },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
];

const businessItems: NavItem[] = [
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Performance", url: "/performance", icon: BarChart3 },
];

const navItems: NavItem[] = [...homeItems, ...clientManagementItems, ...businessItems];

const mobileNavItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "More", url: "#more", icon: MoreHorizontal },
];

function isNavActive(item: { url: string }, pathname: string): boolean {
  if (pathname === item.url) return true;
  if (item.url === "/calendar" && (pathname.startsWith("/calendar") || pathname.startsWith("/appointments"))) return true;
  if (item.url === "/todos" && pathname.startsWith("/todos")) return true;
  if (item.url === "/contacts" && pathname.startsWith("/contacts")) return true;
  if (item.url === "/follow-ups" && pathname.startsWith("/follow-ups")) return true;
  if (item.url === "/properties" && pathname.startsWith("/properties")) return true;
  return false;
}

function renderNavItem(item: NavItem, pathname: string) {
  const active = isNavActive(item, pathname);
  return (
    <NavLink
      key={item.title}
      to={item.url}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary")} />
      <span className="truncate">{item.title}</span>
    </NavLink>
  );
}

interface SidebarNavigationProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarNavigation({ collapsed, onToggle }: SidebarNavigationProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAuth();

  const desktopWidth = collapsed ? layout.sidebarCollapsed : layout.sidebarWidth;

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden print:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar — theme-aware, collapsible */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden md:flex flex-col print:hidden transition-[width] duration-250 ease-in-out",
          "bg-sidebar border-r border-sidebar-border min-h-screen"
        )}
        style={{ width: desktopWidth }}
      >
        {/* Logo / brand — teal to match main page (dashboard clock, KPIs) */}
        <div className="flex h-[60px] shrink-0 items-center border-b border-sidebar-border px-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal">
              <Database className="h-5 w-5 text-teal-foreground" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/70">Data</span>
                <span className="text-sm font-semibold text-teal truncate">Dungeon</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  onClick={onToggle}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>
        {collapsed && (
          <div className="flex shrink-0 justify-center py-2 border-b border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  onClick={onToggle}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Nav links: grouped when expanded, flat when collapsed */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
          {collapsed ? (
            navItems.map((item) => {
              const active = isNavActive(item, location.pathname);
              const link = (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary")} />
                </NavLink>
              );
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            })
          ) : (
            <>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Home</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {homeItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Client management</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {clientManagementItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Business</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {businessItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </nav>

        {/* Footer: Settings + Sign out */}
        <div className="shrink-0 border-t border-sidebar-border p-2 space-y-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate ml-0">Settings</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56 bg-popover border-border">
              <DropdownMenuItem asChild>
                <NavLink to="/scripts" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                  <FileText className="w-4 h-4" />
                  Scripts
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                  <Settings className="w-4 h-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate ml-0">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile slide-out */}
      <aside
        className={cn(
          "fixed z-50 w-[280px] h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-250 print:hidden md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4 mt-12">
          <div className="h-9 w-9 rounded-lg bg-teal flex items-center justify-center">
            <Database className="h-5 w-5 text-teal-foreground" />
          </div>
          <span className="text-sm font-semibold text-teal">Data Dungeon</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isNavActive(item, location.pathname);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
          <div className="pt-4 mt-4 border-t border-sidebar-border space-y-1">
            <NavLink to="/scripts" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <FileText className="h-5 w-5" />
              Scripts
            </NavLink>
            <NavLink to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/70 truncate mb-2">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent/50" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border md:hidden print:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            if (item.url === "#more") {
              return (
                <DropdownMenu key={item.title}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-sidebar-foreground">
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">More</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-48 mb-2 bg-popover border-border">
                    <DropdownMenuItem asChild>
                      <NavLink to="/properties" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <Building2 className="w-4 h-4" />
                        Properties
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/marketing" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <Megaphone className="w-4 h-4" />
                        Marketing
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/performance" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <BarChart3 className="w-4 h-4" />
                        Performance
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem asChild>
                      <NavLink to="/scripts" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <FileText className="w-4 h-4" />
                        Scripts
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/settings" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <Settings className="w-4 h-4" />
                        Settings
                      </NavLink>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }
            const active = location.pathname === item.url;
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
