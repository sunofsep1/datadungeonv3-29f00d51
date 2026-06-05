import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll to a settings field when navigating with `#field-id` hash. */
export function useSettingsFieldFocus() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash || hash.length < 2) return;
    const id = hash.slice(1);
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/40", "ring-offset-2", "ring-offset-background", "rounded-md");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary/40", "ring-offset-2", "ring-offset-background", "rounded-md");
      }, 2200);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [hash]);
}
