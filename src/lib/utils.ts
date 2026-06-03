import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Derive initials from first/last name, or fallback to full name. */
export function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallbackName?: string | null
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (lastName) return lastName.slice(0, 2).toUpperCase();
  if (fallbackName && fallbackName.trim()) {
    const parts = fallbackName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fallbackName.slice(0, 2).toUpperCase();
  }
  return "?";
}

/** Supabase/PostgREST errors are plain objects with `message`, not always `instanceof Error`. */
export function errorMessageFromUnknown(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  if (typeof e === "string") return e;
  return "Something went wrong";
}

/** Postgres 23505 / unique violations — friendlier copy for contact save flows. */
export function formatContactSaveError(e: unknown): string {
  const msg = errorMessageFromUnknown(e);
  const code =
    typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
  const isDup = code === "23505" || /duplicate key|unique constraint/i.test(msg);
  if (!isDup) return msg;
  if (/email|contacts_email/i.test(msg)) {
    return "That email is already on another contact. Use a different email, clear the field, or find and edit the existing contact.";
  }
  return "This would duplicate an existing record. Check for a matching contact and try again.";
}
