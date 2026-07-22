import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Megaphone,
  Menu,
  X,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  ClipboardList,
  Building2,
  ListTodo,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Workflow,
  Activity,
  ClipboardCheck,
  Flame,
  Swords,
  LineChart,
  Receipt,
  MapPin,
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
import { DataDungeonBrand } from "@/components/brand/DataDungeonBrand";
import { useGameMode } from "@/hooks/useGameMode";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const GAME_MODE_NAV_URLS = new Set(["/lair", "/training"]);

const homeItems: NavItem[] = [
  { title: "Daily Hub", url: "/attention-hub", icon: Sparkles },
  { title: "Drako's Lair", url: "/lair", icon: Flame },
  { title: "Drako's Trials", url: "/training", icon: Swords },
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
];

const dailyWorkItems: NavItem[] = [
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "My Markets", url: "/contacts/markets", icon: MapPin },
  { title: "Listings", url: "/listings", icon: Building2 },
  { title: "Appraisals", url: "/appraisals", icon: ClipboardList },
  { title: "Pricing", url: "/pricing", icon: LineChart },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
];

const relationshipItems: NavItem[] = [
  { title: "Nurture", url: "/nurture", icon: Sparkles },
  { title: "To-Do lists", url: "/todos", icon: ListTodo },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
];

const automationItems: NavItem[] = [
  { title: "Scripts", url: "/scripts", icon: FileText },
];

const planningItems: NavItem[] = [{ title: "Reviews & events", url: "/annual-reviews", icon: ClipboardCheck }];

const businessItems: NavItem[] = [
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Performance", url: "/performance", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Invoices", url: "/invoices", icon: Receipt },
];

const insightsItems: NavItem[] = [];

const communicationsItems: NavItem[] = [
  { title: "Templates & history", url: "/communications", icon: FileText },
  { title: "SMS suite", url: "/communications/sms", icon: MessageSquare },
];

const navItems: NavItem[] = [
  ...homeItems,
  ...dailyWorkItems,
  ...relationshipItems,
  ...automationItems,
  ...planningItems,
  ...businessItems,
  ...insightsItems,
  ...communicationsItems,
];

const mobileNavItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Listings", url: "/listings", icon: Building2 },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "More", url: "#more", icon: MoreHorizontal },
];

function isNavActive(item: { url: string }, pathname: string): boolean {
  if (pathname === item.url) return true;
  if (item.url === "/calendar" && (pathname.startsWith("/calendar") || pathname.startsWith("/appointments"))) return true;
  if (item.url === "/lair" && pathname.startsWith("/lair")) return true;
  if (item.url === "/training" && pathname.startsWith("/training")) return true;
  if (item.url === "/attention-hub" && pathname.startsWith("/attention-hub")) return true;
  if (item.url === "/todos" && pathname.startsWith("/todos")) return true;
  if (item.url === "/tasks" && pathname.startsWith("/tasks")) return true;
  if (item.url === "/contacts/markets" && pathname.startsWith("/contacts/markets")) return true;
  if (item.url === "/contacts" && pathname.startsWith("/contacts")) return true;
  if (item.url === "/nurture" && pathname.startsWith("/nurture")) return true;
  if (item.url === "/properties" && pathname.startsWith("/properties")) return true;
  if (item.url === "/appraisals" && pathname.startsWith("/appraisals")) return true;
  if (item.url === "/listings" && (pathname === "/listings" || pathname.startsWith("/listings/"))) return true;
  if (item.url === "/pricing" && pathname.startsWith("/pricing")) return true;
  if (item.url === "/annual-reviews" && pathname.startsWith("/annual-reviews")) return true;
  if (item.url === "/communications/sms" && pathname.startsWith("/communications/sms")) return true;
  if (item.url === "/communications" && pathname === "/communications") return true;
  if (item.url === "/invoices" && pathname.startsWith("/invoices")) return true;
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
  const { gameModeEnabled } = useGameMode();

  const visibleHomeItems = homeItems.filter(
    (item) => gameModeEnabled || !GAME_MODE_NAV_URLS.has(item.url),
  );
  const visibleNavItems = navItems.filter(
    (item) => gameModeEnabled || !GAME_MODE_NAV_URLS.has(item.url),
  );
  const bottomNavItems = gameModeEnabled
    ? [
        { title: "Hub", url: "/attention-hub", icon: Sparkles },
        { title: "Contacts", url: "/contacts", icon: Users },
        { title: "Lair", url: "/lair", icon: Flame },
        { title: "Tasks", url: "/tasks", icon: CheckSquare },
        { title: "More", url: "#more", icon: MoreHorizontal },
      ]
    : mobileNavItems;

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
          "fixed left-0 top-0 z-40 hidden md:flex flex-col overflow-hidden print:hidden transition-[width] duration-250 ease-in-out",
          "bg-sidebar border-r border-sidebar-border h-dvh max-h-dvh"
        )}
        style={{ width: desktopWidth }}
      >
        {/* Logo / brand — pixel wordmark (no graphic) */}
        <div className="flex h-[60px] shrink-0 items-center border-b border-sidebar-border px-3">
          <div className="flex min-w-0 flex-1 items-center">
            <DataDungeonBrand collapsed={collapsed} />
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

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <nav className="space-y-0.5 p-2 pr-1" aria-label="Main navigation">
          {collapsed ? (
            visibleNavItems.map((item) => {
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
                  {visibleHomeItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Daily work</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {dailyWorkItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Relationships & records</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {relationshipItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Automation & scripts</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {automationItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Planning</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {planningItems.map((item) => renderNavItem(item, location.pathname))}
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
              {insightsItems.length > 0 ? (
              <Collapsible defaultOpen={false} className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Insights</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {insightsItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
              ) : null}
              <Collapsible defaultOpen className="space-y-0.5">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30">
                  <span>Communications</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 pt-0.5">
                  {communicationsItems.map((item) => renderNavItem(item, location.pathname))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
          </nav>
        </div>

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
          "fixed z-50 w-[280px] h-dvh max-h-dvh flex flex-col overflow-hidden bg-sidebar border-r border-sidebar-border transition-transform duration-250 print:hidden md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4 mt-12">
          <DataDungeonBrand collapsed={false} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
          <nav className="space-y-1 p-3" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
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
        </div>
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
          {bottomNavItems.map((item) => {
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
                      <NavLink to="/annual-reviews" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <ClipboardCheck className="w-4 h-4" />
                        Reviews & events
                      </NavLink>
                    </DropdownMenuItem>
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
                    <DropdownMenuItem asChild>
                      <NavLink to="/reports" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <FileText className="w-4 h-4" />
                        Reports
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/invoices" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <Receipt className="w-4 h-4" />
                        Invoices
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/communications/sms" className="flex items-center gap-2 text-popover-foreground focus:bg-accent focus:text-accent-foreground">
                        <MessageSquare className="w-4 h-4" />
                        SMS suite
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
            const active = isNavActive(item, location.pathname);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-[56px]",
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
