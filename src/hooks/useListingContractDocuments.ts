import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supabaseErrorMessage";

export type ListingContractDocType =
  | "signed_contract"
  | "solicitor_letter"
  | "condition_evidence"
  | "other";

export type ListingContractDocument = {
  id: string;
  listing_id: string;
  offer_id: string;
  user_id: string;
  doc_type: ListingContractDocType;
  title: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  source: string;
  parsed_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function useListingContractDocuments(offerId: string | undefined) {
  return useQuery({
    queryKey: ["listing_contract_documents", offerId ?? ""],
    queryFn: async (): Promise<ListingContractDocument[]> => {
      if (!offerId) return [];
      const { data, error } = await supabase
        .from("listing_contract_documents")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: false });
      if (error) {
        if (error.code === "42P01") return [];
        throw new Error(supabaseErrorMessage(error));
      }
      return (data ?? []) as ListingContractDocument[];
    },
    enabled: !!offerId,
  });
}

export function useCreateListingContractDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      offer_id: string;
      doc_type: ListingContractDocType;
      title?: string | null;
      storage_path: string;
      file_name: string;
      mime_type?: string | null;
      source?: string;
      parsed_snapshot?: Record<string, unknown> | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("listing_contract_documents")
        .insert({
          listing_id: input.listing_id,
          offer_id: input.offer_id,
          user_id: user.id,
          doc_type: input.doc_type,
          title: input.title?.trim() || null,
          storage_path: input.storage_path,
          file_name: input.file_name,
          mime_type: input.mime_type ?? null,
          source: input.source ?? "upload",
          parsed_snapshot: input.parsed_snapshot ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(supabaseErrorMessage(error));
      return data as ListingContractDocument;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["listing_contract_documents", row.offer_id] });
    },
  });
}

export function useDeleteListingContractDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; offer_id: string; storage_path: string }) => {
      await supabase.storage.from("property-images").remove([input.storage_path]);
      const { error } = await supabase.from("listing_contract_documents").delete().eq("id", input.id);
      if (error) throw new Error(supabaseErrorMessage(error));
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["listing_contract_documents", v.offer_id] });
    },
  });
}

export async function uploadContractDocumentFile(
  userId: string,
  listingId: string,
  offerId: string,
  file: File,
): Promise<{ storage_path: string; publicUrl: string }> {
  const ext = file.name.split(".").pop() || "pdf";
  const storage_path = `${userId}/listings/${listingId}/contracts/${offerId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("property-images")
    .upload(storage_path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(storage_path);
  return { storage_path, publicUrl: urlData.publicUrl };
}
