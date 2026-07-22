import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { EmailComposeDialog } from "@/components/contacts/EmailComposeDialog";
import { SendSmsDialog } from "@/components/contacts/SendSmsDialog";

export type ComposeEmailArgs = {
  to: string;
  contactId?: string;
  contactName?: string;
  firstName?: string | null;
};
export type ComposeSmsArgs = {
  to: string;
  contactId?: string;
  contactName?: string;
  firstName?: string | null;
  lastName?: string | null;
};

type ComposeContextValue = {
  openEmail: (args: ComposeEmailArgs) => void;
  openSms: (args: ComposeSmsArgs) => void;
};

const ComposeContext = createContext<ComposeContextValue | null>(null);

/** Open the branded email/SMS composer from anywhere in the app. Safe no-op if used outside the provider. */
export function useCompose(): ComposeContextValue {
  const ctx = useContext(ComposeContext);
  return ctx ?? { openEmail: () => {}, openSms: () => {} };
}

/**
 * App-wide composer. Mounts the branded Email + SMS dialogs once, and intercepts every
 * legacy `mailto:` link click so it opens the branded composer instead of the OS mail app.
 */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailArgs, setEmailArgs] = useState<ComposeEmailArgs>({ to: "" });
  const [smsArgs, setSmsArgs] = useState<ComposeSmsArgs>({ to: "" });

  const openEmail = useCallback((args: ComposeEmailArgs) => {
    setEmailArgs(args);
    setEmailOpen(true);
  }, []);
  const openSms = useCallback((args: ComposeSmsArgs) => {
    setSmsArgs(args);
    setSmsOpen(true);
  }, []);

  // Intercept any mailto: link click, app-wide, and route it to the branded composer.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="mailto:"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const to = decodeURIComponent(href.replace(/^mailto:/i, "").split("?")[0]).trim();
      if (!to) return;
      e.preventDefault();
      openEmail({
        to,
        contactId: anchor.dataset.contactId,
        contactName: anchor.dataset.contactName,
      });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [openEmail]);

  return (
    <ComposeContext.Provider value={{ openEmail, openSms }}>
      {children}
      {emailArgs.to && (
        <EmailComposeDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          to={emailArgs.to}
          contactId={emailArgs.contactId}
          contactName={emailArgs.contactName}
          firstName={emailArgs.firstName}
        />
      )}
      {smsArgs.to && (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          to={smsArgs.to}
          contactId={smsArgs.contactId ?? null}
          contactName={smsArgs.contactName}
          firstName={smsArgs.firstName}
          lastName={smsArgs.lastName}
        />
      )}
    </ComposeContext.Provider>
  );
}
