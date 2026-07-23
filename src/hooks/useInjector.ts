import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Note Master review-inbox data layer.
 *
 * injector_notes / injector_proposals are populated by the pocket-extract edge
 * function and are NOT in the generated Supabase types yet, so we use a
 * loosely-typed client here (same pattern as useMessageTemplates).
 */

export type ProposalEntityType = "contact" | "property" | "task";
export type ProposalStatus = "pending" | "applied" | "rejected";

export interface InjectorProposal {
  id: string;
  note_id: string;
  entity_type: ProposalEntityType;
  action: string;
  match_contact_id: string | null;
  confidence: number | null;
  status: ProposalStatus;
  // deno free-form extracted payload
  proposed: Record<string, unknown>;
}

export interface InjectorNote {
  id: string;
  title: string | null;
  summary_md: string | null;
  status: string;
  error: string | null;
  created_at: string;
  proposals: InjectorProposal[];
}

const KEY = ["injector-inbox"] as const;

const db = supabase as unknown as { from: (t: string) => any };

/** Notes awaiting review (received / extracted / error) with their pending proposals. */
export function useInjectorInbox() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEY,
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    queryFn: async (): Promise<InjectorNote[]> => {
      const { data: notes, error } = await db
        .from("injector_notes")
        .select("id,title,summary_md,status,error,created_at")
        .in("status", ["received", "extracted", "error"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      const list = (notes ?? []) as InjectorNote[];
      if (list.length === 0) return [];

      const ids = list.map((n) => n.id);
      const { data: props, error: pErr } = await db
        .from("injector_proposals")
        .select("id,note_id,entity_type,action,match_contact_id,confidence,status,proposed")
        .in("note_id", ids)
        .neq("status", "applied");
      if (pErr) throw new Error(pErr.message);

      const byNote = new Map<string, InjectorProposal[]>();
      for (const p of (props ?? []) as InjectorProposal[]) {
        const arr = byNote.get(p.note_id) ?? [];
        arr.push(p);
        byNote.set(p.note_id, arr);
      }
      const order: Record<string, number> = { contact: 0, property: 1, task: 2 };
      return list.map((n) => ({
        ...n,
        proposals: (byNote.get(n.id) ?? []).sort((a, b) => (order[a.entity_type] ?? 9) - (order[b.entity_type] ?? 9)),
      }));
    },
  });
}

/** Count of notes needing review — for a sidebar / hub badge. */
export function useInjectorPendingCount() {
  const { data } = useInjectorInbox();
  return (data ?? []).filter((n) => n.status === "extracted" && n.proposals.some((p) => p.status === "pending")).length;
}

export function useInjectorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  /** Add a proposal by hand (e.g. when the Note Master found nothing, or you spotted
   * something it missed). Creates a blank pending row you then fill in and Apply. */
  const addProposal = useMutation({
    mutationFn: async (input: { note_id: string; entity_type: ProposalEntityType }) => {
      const defaults: Record<ProposalEntityType, Record<string, unknown>> = {
        contact: { name: "" },
        task: { title: "" },
        property: { address: "", ownership_type: "unknown" },
      };
      const { error } = await db.from("injector_proposals").insert({
        note_id: input.note_id,
        user_id: user?.id,
        entity_type: input.entity_type,
        action: "create",
        match_contact_id: null,
        confidence: 1,
        status: "pending",
        proposed: defaults[input.entity_type],
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Permanently remove a proposal (used for a hand-added row you no longer want). */
  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("injector_proposals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Edit a proposal's extracted fields and/or re-match it to a different contact. */
  const updateProposal = useMutation({
    mutationFn: async (input: { id: string; proposed?: Record<string, unknown>; match_contact_id?: string | null; action?: string }) => {
      const patch: Record<string, unknown> = {};
      if (input.proposed) patch.proposed = input.proposed;
      if (input.match_contact_id !== undefined) {
        patch.match_contact_id = input.match_contact_id;
        patch.action = input.action ?? (input.match_contact_id ? "update" : "create");
      }
      const { error } = await db.from("injector_proposals").update(patch).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const setProposalStatus = useMutation({
    mutationFn: async (input: { id: string; status: ProposalStatus }) => {
      const { error } = await db.from("injector_proposals").update({ status: input.status }).eq("id", input.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  /** Apply all still-pending proposals for a note (writes to the CRM via edge fn). */
  const applyNote = useMutation({
    mutationFn: async (noteId: string): Promise<{ applied: number }> => {
      const { data, error } = await supabase.functions.invoke("pocket-apply", { body: { note_id: noteId } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      return { applied: data?.applied ?? 0 };
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  /** Dismiss a whole note without applying (marks it reviewed so it leaves the inbox). */
  const dismissNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await db.from("injector_notes").update({ status: "dismissed" }).eq("id", noteId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return { updateProposal, setProposalStatus, applyNote, dismissNote, addProposal, deleteProposal };
}

/** Lightweight contact search for the re-match picker. */
export function useContactSearch(term: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["injector-contact-search", term],
    enabled: Boolean(user?.id) && term.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const t = term.trim().replace(/[,()*%]/g, " ");
      const { data, error } = await db
        .from("contacts")
        .select("id,name,first_name,last_name,mobile,email,suburb")
        .or(`name.ilike.%${t}%,first_name.ilike.%${t}%,last_name.ilike.%${t}%`)
        .limit(8);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; name: string | null; mobile: string | null; email: string | null; suburb: string | null }[];
    },
  });
}
