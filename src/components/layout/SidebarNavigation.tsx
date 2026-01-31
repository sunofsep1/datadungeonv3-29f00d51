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
  { title: "Contacts", url: "/contacts", icon: Users },
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
  if (item.url === "/contacts" && pathname.startsWith("/contacts")) return true;
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
        "text-white/70 hover:bg-white/10 hover:text-white",
        active && "bg-[#00BCD4]/20 text-[#00BCD4] hover:bg-[#00BCD4]/25 hover:text-[#00BCD4]"
      )}
    >
      <item.icon className={cn("h-5 w-5 shrink-0", active && "text-[#00BCD4]")} />
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

      {/* Desktop sidebar — Zoho-style dark, collapsible */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden md:flex flex-col print:hidden transition-[width] duration-250 ease-in-out",
          "bg-[#1e1e1e] border-r border-white/10 min-h-screen"
        )}
        style={{ width: desktopWidth }}
      >
        {/* Logo / brand */}
        <div className="flex h-[60px] shrink-0 items-center border-b border-white/10 px-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00BCD4]">
              <Database className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Data</span>
                <span className="text-sm font-semibold text-white truncate">Dungeon</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-white/60 hover:bg-white/10 hover:text-white"
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
          <div className="flex shrink-0 justify-center py-2 border-b border-white/10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
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
                    "text-white/70 hover:bg-white/10 hover:text-white",
                    active && "bg-[#00BCD4]/20 text-[#00BCD4] hover:bg-[#00BCD4]/25 hover:text-[#00BCD4]"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", active && "text-[#00BCD4]")} />
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
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5">
                  <span>Home</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {homeItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5">
                  <span>Client management</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {clientManagementItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/50 hover:text-white/70 hover:bg-white/5">
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
        <div className="shrink-0 border-t border-white/10 p-2 space-y-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-white/70 hover:bg-white/10 hover:text-white",
                  collapsed && "justify-center px-0"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate ml-0">Settings</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56 bg-[#2c2c2c] border-white/10">
              <DropdownMenuItem asChild>
                <NavLink to="/scripts" className="flex items-center gap-2 text-white/90 focus:bg-white/10 focus:text-white">
                  <FileText className="w-4 h-4" />
                  Scripts
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/settings" className="flex items-center gap-2 text-white/90 focus:bg-white/10 focus:text-white">
                  <Settings className="w-4 h-4" />
                  Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <div className="px-2 py-1.5 text-xs text-white/50 truncate">{user?.email}</div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-white/70 hover:bg-white/10 hover:text-white",
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
          "fixed z-50 w-[280px] h-full bg-[#1e1e1e] border-r border-white/10 flex flex-col transition-transform duration-250 print:hidden md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-white/10 px-4 mt-12">
          <div className="h-9 w-9 rounded-lg bg-[#00BCD4] flex items-center justify-center">
            <Database className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Data Dungeon</span>
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
                  active ? "bg-[#00BCD4]/20 text-[#00BCD4]" : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
          <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
            <NavLink to="/scripts" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-white/70 hover:bg-white/10">
              <FileText className="h-5 w-5" />
              Scripts
            </NavLink>
            <NavLink to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-white/70 hover:bg-white/10">
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
          </div>
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/50 truncate mb-2">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-white/70 hover:bg-white/10" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e1e1e] border-t border-white/10 md:hidden print:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            if (item.url === "#more") {
              return (
                <DropdownMenu key={item.title}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 text-white/50">
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">More</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-48 mb-2 bg-[#2c2c2c] border-white/10">
                    <DropdownMenuItem asChild>
                      <NavLink to="/properties" className="flex items-center gap-2 text-white/90 focus:bg-white/10">
                        <Building2 className="w-4 h-4" />
                        Properties
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/marketing" className="flex items-center gap-2 text-white/90 focus:bg-white/10">
                        <Megaphone className="w-4 h-4" />
                        Marketing
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/performance" className="flex items-center gap-2 text-white/90 focus:bg-white/10">
                        <BarChart3 className="w-4 h-4" />
                        Performance
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <NavLink to="/scripts" className="flex items-center gap-2 text-white/90 focus:bg-white/10">
                        <FileText className="w-4 h-4" />
                        Scripts
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/settings" className="flex items-center gap-2 text-white/90 focus:bg-white/10">
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
                  active ? "text-[#00BCD4]" : "text-white/50"
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
