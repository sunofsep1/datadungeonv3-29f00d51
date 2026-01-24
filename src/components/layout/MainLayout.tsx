import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 p-4 sm:p-6 overflow-auto print:p-0 print:w-full pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
