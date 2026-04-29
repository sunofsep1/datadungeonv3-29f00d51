import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PrintReportLayoutProps {
  children: ReactNode;
  onClose?: () => void;
}

/**
 * Shared wrapper for print routes: keeps a consistent close action and page shell.
 */
export function PrintReportLayout({ children, onClose }: PrintReportLayoutProps) {
  return (
    <div className="contact-print-page">
      {onClose ? (
        <div className="print-page-chrome print-only-hide">
          <Button variant="outline" size="sm" onClick={onClose} className="gap-2">
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
