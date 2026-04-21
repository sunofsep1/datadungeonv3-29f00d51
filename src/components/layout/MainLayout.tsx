import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { HeaderBar } from "./HeaderBar";
import { SidebarNavigation } from "./SidebarNavigation";
import { GlobalSearch } from "./GlobalSearch";
import { LogTouchDialog } from "./LogTouchDialog";
import { layout } from "@/lib/designTokens";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebarWidth = sidebarCollapsed ? layout.sidebarCollapsed : layout.sidebarWidth;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileNavOpen((open) => !open);
    } else {
      setSidebarCollapsed((c) => !c);
    }
  };

  return (
    <div className="zoho-layout flex h-dvh min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-background">
      <SidebarNavigation
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
      />
      {/* Spacer so main content starts after sidebar (desktop) */}
      <div
        className={cn("hidden md:block shrink-0 transition-[width] duration-250 print:hidden")}
        style={{ width: sidebarWidth }}
      />
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <GlobalSearch />
        <LogTouchDialog />
        <HeaderBar
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={handleMenuClick}
        />
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-auto overscroll-y-contain p-4 sm:p-6 print:p-0 print:w-full bg-background text-foreground",
            "pb-[calc(4rem+env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-6"
          )}
          style={{
            paddingTop: `calc(env(safe-area-inset-top, 0px) + ${layout.headerHeight} + 1rem)`,
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
