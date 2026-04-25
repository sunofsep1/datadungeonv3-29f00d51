import { ReactNode, useState } from "react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarWidth = sidebarCollapsed ? layout.sidebarCollapsed : layout.sidebarWidth;

  return (
    <div className="zoho-layout flex min-h-dvh w-full max-w-[100vw] overflow-x-clip bg-background">
      <SidebarNavigation
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      {/* Spacer so main content starts after sidebar (desktop) */}
      <div
        className={cn("hidden md:block shrink-0 transition-[width] duration-250 print:hidden")}
        style={{ width: sidebarWidth }}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <GlobalSearch />
        <LogTouchDialog />
        <HeaderBar
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setSidebarCollapsed((c) => !c)}
        />
        <main
          className={cn(
            "flex flex-1 flex-col p-4 sm:p-6 print:p-0 print:w-full bg-background text-foreground",
            "pb-20 md:pb-6"
          )}
          style={{ paddingTop: `calc(${layout.headerHeight} + 1rem)` }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
