import { Badge } from "@/components/ui/badge";
import { formatPhoneDisplay } from "@/lib/formatPhone";
import { useContactClassAssignments } from "@/hooks/useContactClasses";
import type { ContactWithMeta } from "@/hooks/useContacts";

type Props = {
  contactId: string;
  contact: ContactWithMeta;
};

export function ContactDetailMetaStrip({ contactId, contact }: Props) {
  const { data: classAssignments = [] } = useContactClassAssignments(contactId);

  const ext = contact as ContactWithMeta & {
    home_phone?: string | null;
    work_phone?: string | null;
    agentbox_id?: number | null;
    aml_id_verified?: boolean | null;
    aml_pep_clear?: boolean | null;
  };

  const hasClasses = classAssignments.length > 0;
  const hasPhones = Boolean(ext.home_phone?.trim() || ext.work_phone?.trim());
  const hasAml = ext.aml_id_verified || ext.aml_pep_clear;
  const hasAgentBox = ext.agentbox_id != null;

  if (!hasClasses && !hasPhones && !hasAml && !hasAgentBox) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {classAssignments.map((row) => (
        <Badge key={row.class_id} variant="outline" className="text-[10px] font-normal">
          {row.contact_classes?.name ?? "Class"}
        </Badge>
      ))}
      {ext.home_phone?.trim() ? (
        <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
          H {formatPhoneDisplay(ext.home_phone)}
        </Badge>
      ) : null}
      {ext.work_phone?.trim() ? (
        <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
          W {formatPhoneDisplay(ext.work_phone)}
        </Badge>
      ) : null}
      {ext.aml_id_verified ? (
        <Badge className="text-[10px] font-normal bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          ID verified
        </Badge>
      ) : null}
      {ext.aml_pep_clear ? (
        <Badge className="text-[10px] font-normal bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          PEP clear
        </Badge>
      ) : null}
      {hasAgentBox ? (
        <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
          AgentBox #{ext.agentbox_id}
        </Badge>
      ) : null}
    </div>
  );
}
