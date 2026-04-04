import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Bell,
  Calendar,
  Mail,
  Settings,
  Menu,
  LayoutGrid,
  LayoutDashboard,
  Users,
  Clock,
  Megaphone,
  BarChart3,
  FileText,
  Building2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { openGlobalSearch } from "./GlobalSearch";
import { AskAIAssistant } from "@/components/ai/AskAIAssistant";
import { NavHeadingButtons } from "./NavHeadingButtons";
import { useNavCounts } from "@/hooks/useNavCounts";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";

const MODULE_TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/attention-hub": "Daily Hub",
  "/nurture": "Nurture",
  "/hot-leads": "Hot Leads",
  "/recent": "Recent",
  "/tasks": "Tasks",
  "/contacts": "Contacts",
  "/calendar": "Calendar",
  "/appointments": "Appointments",
  "/marketing": "Marketing",
  "/performance": "Performance",
  "/scripts": "Scripts",
  "/automations": "Automations",
  "/data-health": "Data health",
  "/annual-reviews": "Reviews & events",
  "/settings": "Settings",
};

function getModuleTitle(pathname: string): string {
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/properties")) return "Properties";
  if (pathname.startsWith("/listings")) return "Listings";
  if (pathname.startsWith("/nurture")) return "Nurture";
  if (pathname.startsWith("/automations")) return "Automations";
  if (pathname.startsWith("/data-health")) return "Data health";
  if (pathname.startsWith("/annual-reviews")) return "Reviews & events";
  if (pathname.startsWith("/calendar") || pathname.startsWith("/appointments")) return "Calendar";
  if (pathname.startsWith("/attention-hub")) return "Daily Hub";
  return MODULE_TITLES[pathname] ?? "Data Dungeon";
}

interface HeaderBarProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export function HeaderBar({ onMenuClick, sidebarCollapsed }: HeaderBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user } = useAuth();
  const { nurtureDueCount, recentCount, tasksCount } = useNavCounts();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const moduleTitle = getModuleTitle(location.pathname);

  const getCreateUrl = () => {
    if (location.pathname.startsWith("/contacts")) return "/contacts";
    if (location.pathname.startsWith("/listings")) return "/listings";
    if (location.pathname.startsWith("/properties")) return "/properties";
    if (location.pathname.startsWith("/appointments")) return "/appointments";
    return "/contacts";
  };

  const handleCreate = () => {
    const url = getCreateUrl();
    if (url === "/contacts") navigate("/contacts");
    else navigate(url);
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  const priorityDotClass = (priority: string) => {
    if (priority === "urgent") return "bg-red-500";
    if (priority === "action_required") return "bg-amber-500";
    return "bg-sky-500";
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-[60px] items-center justify-between border-b px-4 transition-[left] duration-250",
        "bg-card border-border text-foreground",
        "left-0",
        sidebarCollapsed ? "md:left-[80px]" : "md:left-[248px]",
        "print:hidden"
      )}
      style={{ height: "60px" }}
    >
      {/* Left: Menu + Module title + Nav heading buttons */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-foreground/80 hover:bg-accent hover:text-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold text-foreground shrink-0 hidden sm:inline">
          {moduleTitle}
        </span>
        <div className="hidden md:flex items-center gap-2 ml-2 min-w-0">
          <NavHeadingButtons
            nurtureDueCount={nurtureDueCount}
            recentCount={recentCount}
            tasksCount={tasksCount}
          />
        </div>
      </div>

      {/* Right: Toolbar */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
          title="Search (⌘K)"
          onClick={openGlobalSearch}
        >
          <Search className="h-5 w-5" />
        </Button>
        <AskAIAssistant />
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
          <SheetContent side="right" className="w-full sm:max-w-md bg-popover border-border text-popover-foreground flex flex-col p-0 max-h-[100dvh]">
            <SheetHeader className="px-4 py-3 border-b border-border text-left space-y-0 shrink-0">
              <div className="flex items-center justify-between gap-2 pr-8">
                <SheetTitle className="text-base font-semibold text-foreground">Notifications</SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              </div>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 px-4 space-y-3 text-center">
                  <p className="text-sm font-medium text-foreground">You&apos;re caught up</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Items appear for overdue tasks, nurture steps, new leads, listing stage changes, hot lead scores, stale priority
                    contacts, and birthday reminders. A scheduled job can also add a short unread summary.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <Link to="/attention-hub" onClick={() => setNotificationsOpen(false)}>
                        Open Daily Hub
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <Link to="/contacts" onClick={() => setNotificationsOpen(false)}>
                        Contacts
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors"
                        onClick={() => {
                          if (!n.read_at) markRead.mutate(n.id);
                          if (n.action_url) {
                            navigate(n.action_url);
                            setNotificationsOpen(false);
                          }
                        }}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", priorityDotClass(n.priority))} />
                            <span className={cn("text-sm truncate", !n.read_at && "font-semibold text-foreground")}>
                              {n.title}
                            </span>
                          </div>
                          {!n.read_at ? <span className="h-2 w-2 rounded-full bg-primary shrink-0" /> : null}
                        </div>
                        {n.body ? <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{n.body}</p> : null}
                        {n.action_label ? (
                          <span className="text-[11px] text-primary mt-1 inline-block">{n.action_label}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 border-t border-border px-4 py-3 space-y-2 bg-muted/10">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Daily CRM digest email is configured separately from this list — it uses Resend and does not mirror every bell item.
              </p>
              <Button variant="ghost" size="sm" className="h-auto py-1.5 px-0 text-xs text-primary hover:text-primary hover:bg-transparent" asChild>
                <Link to="/settings#settings-notifications" onClick={() => setNotificationsOpen(false)}>
                  Notification settings & digest
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
          onClick={() => navigate("/calendar")}
          title="Calendar"
        >
          <Calendar className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
              title="Emails"
              aria-label="Emails"
            >
              <Mail className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-popover border-border text-popover-foreground">
            <div className="px-3 py-2 border-b border-border">
              <span className="font-semibold text-sm">Emails</span>
            </div>
            <div className="py-8 px-4 text-center text-sm text-muted-foreground">
              Coming soon
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
              title="Apps"
              aria-label="App launcher"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-popover-foreground">
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/contacts")}>
              <Users className="h-4 w-4 mr-2" />
              Contacts
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/properties")}>
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/calendar")}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/appointments")}>
              <Clock className="h-4 w-4 mr-2" />
              Appointments
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/marketing")}>
              <Megaphone className="h-4 w-4 mr-2" />
              Marketing
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/performance")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground/90 focus:bg-accent focus:text-foreground" onClick={() => navigate("/scripts")}>
              <FileText className="h-4 w-4 mr-2" />
              Scripts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:bg-accent hover:text-primary"
          onClick={() => navigate("/settings")}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-border hover:bg-accent"
            >
              <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            <div className="px-2 py-2 text-xs text-muted-foreground truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="text-popover-foreground/90 focus:bg-accent focus:text-foreground"
              onClick={() => navigate("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-popover-foreground/90 focus:bg-accent focus:text-foreground"
              onClick={() => navigate("/scripts")}
            >
              Scripts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
