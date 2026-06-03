import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useContactDuplicateHints } from "@/hooks/useContactDuplicateHints";

type Props = {
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  excludeId?: string | null;
};

export function ContactDuplicateAlert({ email, phone, mobile, excludeId }: Props) {
  const { data: duplicates = [], isLoading } = useContactDuplicateHints({
    email,
    phone,
    mobile,
    excludeId,
  });

  if (isLoading || duplicates.length === 0) return null;

  return (
    <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/10 text-foreground">
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <AlertTitle className="text-amber-200">Possible duplicate contact</AlertTitle>
      <AlertDescription className="text-sm text-muted-foreground space-y-2">
        <p>Another contact already uses this email or phone:</p>
        <ul className="space-y-1">
          {duplicates.slice(0, 5).map((d) => (
            <li key={d.id}>
              <Link to={`/contacts/${d.id}`} className="text-primary hover:underline font-medium">
                {d.name?.trim() || "Unnamed contact"}
              </Link>
              <span className="text-xs text-muted-foreground ml-1">({d.matchReasons.join(", ")})</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
