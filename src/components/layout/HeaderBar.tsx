import { useLocation, useNavigate } from "react-router-dom";
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
import { cn } from "@/lib/utils";

const MODULE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/contacts": "Contacts",
  "/calendar": "Calendar",
  "/appointments": "Appointments",
  "/marketing": "Marketing",
  "/performance": "Performance",
  "/scripts": "Scripts",
  "/settings": "Settings",
};

function getModuleTitle(pathname: string): string {
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/calendar") || pathname.startsWith("/appointments")) return "Calendar";
  return MODULE_TITLES[pathname] ?? "Data Dungeon";
}

interface HeaderBarProps {
  onMenuClick?: () => void;
  sidebarCollapsed?: boolean;
}

export function HeaderBar({ onMenuClick, sidebarCollapsed }: HeaderBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-[60px] items-center justify-between border-b px-4 transition-[left] duration-250",
        "bg-[#2c2c2c] border-white/10 text-white",
        "left-0",
        sidebarCollapsed ? "md:left-[80px]" : "md:left-[248px]"
      )}
      style={{ height: "60px" }}
    >
      {/* Left: Menu + Module title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold text-white">
          {moduleTitle}
        </span>
      </div>

      {/* Right: Toolbar */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
          title="Search (⌘K)"
          onClick={openGlobalSearch}
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-[#4A90E2] hover:bg-[#357ABD] text-white"
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-[#2c2c2c] border-white/10 text-white">
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-white/60 hover:text-white hover:bg-white/10">
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            </div>
            <div className="py-8 px-4 text-center text-sm text-white/50">
              No notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
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
              className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
              title="Emails"
              aria-label="Emails"
            >
              <Mail className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-[#2c2c2c] border-white/10 text-white">
            <div className="px-3 py-2 border-b border-white/10">
              <span className="font-semibold text-sm">Emails</span>
            </div>
            <div className="py-8 px-4 text-center text-sm text-white/50">
              Coming soon
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
              title="Apps"
              aria-label="App launcher"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#2c2c2c] border-white/10 text-white">
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/contacts")}>
              <Users className="h-4 w-4 mr-2" />
              Contacts
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/properties")}>
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/calendar")}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/appointments")}>
              <Clock className="h-4 w-4 mr-2" />
              Appointments
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/marketing")}>
              <Megaphone className="h-4 w-4 mr-2" />
              Marketing
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/performance")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/90 focus:bg-white/10 focus:text-white" onClick={() => navigate("/scripts")}>
              <FileText className="h-4 w-4 mr-2" />
              Scripts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/70 hover:bg-white/10 hover:text-[#00BCD4]"
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
              className="h-9 w-9 rounded-full border border-white/20 hover:bg-white/10"
            >
              <Avatar className="h-8 w-8 bg-[#00BCD4]/20 text-[#00BCD4]">
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#2c2c2c] border-white/10">
            <div className="px-2 py-2 text-xs text-white/60 truncate">
              {user?.email}
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="text-white/90 focus:bg-white/10 focus:text-white"
              onClick={() => navigate("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-white/90 focus:bg-white/10 focus:text-white"
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
