import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logContactActivity, invalidateContactInteractions } from "@/lib/contactActivityLog";

export type ContactDocumentCategory =
  | "correspondence"
  | "report"
  | "certificate"
  | "marketing"
  | "listing_photos"
  | "listing_presentation"
  | "signage"
  | "appraisal"
  | "contract"
  | "disclosure"
  | "other";

export interface ContactDocument {
  id: string;
  user_id: string;
  contact_id: string;
  property_id: string | null;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: ContactDocumentCategory;
  created_at: string;
  signed_url?: string | null;
}

export interface ContactDocumentInsert {
  contact_id: string;
  property_id?: string | null;
  name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  category?: ContactDocumentCategory;
}

const BUCKET = "contact-documents";
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

export function useContactDocuments(contactId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contact_documents", contactId],
    queryFn: async (): Promise<ContactDocument[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !contactId) return [];

      const { data, error } = await (supabase as any)
        .from("contact_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as ContactDocument[];

      const withUrls = await Promise.all(
        rows.map(async (row) => {
          const { data: urlData } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(row.file_path, SIGNED_URL_EXPIRY);
          return { ...row, signed_url: urlData?.signedUrl ?? null };
        })
      );
      return withUrls;
    },
    enabled: !!contactId,
  });

  return query;
}

export function usePropertyDocuments(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["contact_documents", "property", propertyId],
    queryFn: async (): Promise<ContactDocument[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !propertyId) return [];

      const { data, error } = await (supabase as any)
        .from("contact_documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as ContactDocument[];

      const withUrls = await Promise.all(
        rows.map(async (row) => {
          const { data: urlData } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(row.file_path, SIGNED_URL_EXPIRY);
          return { ...row, signed_url: urlData?.signedUrl ?? null };
        })
      );
      return withUrls;
    },
    enabled: !!propertyId,
  });
}

export function useCreateContactDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      file,
      propertyId,
      category,
    }: {
      contactId: string;
      file: File;
      propertyId?: string | null;
      category?: ContactDocumentCategory;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() ?? "";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${contactId}/${crypto.randomUUID()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data, error } = await (supabase as any)
        .from("contact_documents")
        .insert({
          user_id: user.id,
          contact_id: contactId,
          property_id: propertyId ?? null,
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          category: category ?? "other",
        })
        .select()
        .single();

      if (error) throw error;
      const row = data as ContactDocument;
      await logContactActivity({
        contactId: contactId,
        subject: "Document uploaded",
        body: `${row.name}${row.category ? ` · ${row.category}` : ""}`,
      });
      return row;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact_documents", variables.contactId] });
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ["contact_documents", "property", variables.propertyId] });
      }
      invalidateContactInteractions(queryClient, variables.contactId);
    },
  });
}

export function useDeleteContactDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      filePath,
      contactId,
      propertyId,
    }: {
      id: string;
      filePath: string;
      contactId: string;
      propertyId?: string | null;
    }) => {
      const { data: prev } = await (supabase as any)
        .from("contact_documents")
        .select("name, category")
        .eq("id", id)
        .maybeSingle();
      await supabase.storage.from(BUCKET).remove([filePath]);
      const { error } = await (supabase as any).from("contact_documents").delete().eq("id", id);
      if (error) throw error;
      await logContactActivity({
        contactId,
        subject: "Document removed",
        body: prev?.name ? `${prev.name}${prev.category ? ` · ${prev.category}` : ""}` : undefined,
      });
      return { contactId, propertyId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact_documents", variables.contactId] });
      if (variables.propertyId) {
        queryClient.invalidateQueries({ queryKey: ["contact_documents", "property", variables.propertyId] });
      }
      invalidateContactInteractions(queryClient, variables.contactId);
    },
  });
}
