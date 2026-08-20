import { useRef, useState } from "react";
import { ExternalLink, FileText, ImageIcon, Layers, Link2, Palette, Plus, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpdateListing } from "@/hooks/useListings";
import {
  useCreateListingResource,
  useDeleteListingResource,
  useListingResources,
} from "@/hooks/useListingResources";
import { LISTING_RESOURCE_KINDS, type ListingResourceKind } from "@/lib/listingFeatures";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  listingId: string;
  heroUrls: string[];
  listingImageUrl?: string | null;
  onUpdated?: () => void;
};

const KIND_ICONS: Record<ListingResourceKind, typeof ImageIcon> = {
  photo: ImageIcon,
  floorplan: Layers,
  document: FileText,
  link: Link2,
  design: Palette,
};

export function ListingResourcesPanel({
  listingId,
  heroUrls,
  listingImageUrl,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateListing = useUpdateListing();
  const createResource = useCreateListingResource();
  const deleteResource = useDeleteListingResource();
  const { data: resources = [], isLoading } = useListingResources(listingId);

  const [dialogKind, setDialogKind] = useState<ListingResourceKind | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const byKind = (kind: ListingResourceKind) =>
    resources.filter((r) => r.kind === kind);

  const openAdd = (kind: ListingResourceKind) => {
    setDialogKind(kind);
    setTitle("");
    setUrl("");
  };

  const handleAddLink = async () => {
    if (!dialogKind || !url.trim()) return;
    try {
      await createResource.mutateAsync({
        listing_id: listingId,
        kind: dialogKind,
        title: title.trim() || null,
        url: url.trim(),
        sort_order: byKind(dialogKind).length,
      });
      setDialogKind(null);
      onUpdated?.();
      toast({ title: "Resource added" });
    } catch (err) {
      toast({
        title: "Could not add",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (kind: ListingResourceKind, file: File) => {
    if (!user) return;
    const allowed =
      kind === "document"
        ? ["application/pdf"]
        : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({
        title: "Invalid file",
        description: kind === "document" ? "Use PDF for documents." : "Use JPEG, PNG, or WebP.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (kind === "document" ? "pdf" : "jpg");
      const path = `${user.id}/listings/${listingId}/resources/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("property-images").getPublicUrl(path);
      await createResource.mutateAsync({
        listing_id: listingId,
        kind,
        title: file.name,
        url: urlData.publicUrl,
        sort_order: byKind(kind).length,
      });
      onUpdated?.();
      toast({ title: "Uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const setAsHero = async (photoUrl: string) => {
    try {
      await updateListing.mutateAsync({ id: listingId, listing_image_url: photoUrl });
      onUpdated?.();
      toast({ title: "Main photo updated" });
    } catch (err) {
      toast({
        title: "Could not set hero",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource.mutateAsync({ id, listing_id: listingId });
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "Failed",
        variant: "destructive",
      });
    }
  };

  const allPhotos = [...heroUrls, ...byKind("photo").map((r) => r.url)].filter(
    (u, i, arr) => arr.indexOf(u) === i,
  );

  return (
    <Card className="zoho-card p-5 border-border">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ImageIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Resources</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Photos, floorplans, documents, and external links for this listing.
          </p>
        </div>
      </div>

      <Tabs defaultValue="photo">
        <TabsList className="mb-4 flex-wrap h-auto">
          {LISTING_RESOURCE_KINDS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {label}
              {key === "photo" && allPhotos.length > 0 && (
                <span className="ml-1 text-muted-foreground">({allPhotos.length})</span>
              )}
              {key !== "photo" && byKind(key).length > 0 && (
                <span className="ml-1 text-muted-foreground">({byKind(key).length})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="photo" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload("photo", f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Upload photo
            </Button>
          </div>
          {allPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos yet. Upload or set a hero from Edit.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allPhotos.map((photoUrl) => {
                const isHero = listingImageUrl === photoUrl;
                return (
                  <div
                    key={photoUrl}
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isHero && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px] px-2"
                          onClick={() => void setAsHero(photoUrl)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Main
                        </Button>
                      )}
                      {isHero && (
                        <span className="text-[10px] text-white font-medium px-1.5 py-1">Main photo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {(["floorplan", "document", "link", "design"] as ListingResourceKind[]).map((kind) => {
          const Icon = KIND_ICONS[kind];
          const items = byKind(kind);
          return (
            <TabsContent key={kind} value={kind} className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {kind === "link" ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => openAdd(kind)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add link
                  </Button>
                ) : kind === "design" ? (
                  <p className="text-xs text-muted-foreground">
                    Designs are created from the Marketing Studio above and saved here automatically.
                  </p>
                ) : (
                  <>
                    <input
                      type="file"
                      accept={kind === "document" ? "application/pdf" : "image/jpeg,image/png,image/webp"}
                      className="hidden"
                      id={`upload-${kind}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUpload(kind, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => document.getElementById(`upload-${kind}`)?.click()}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Upload {kind === "floorplan" ? "floorplan" : "document"}
                    </Button>
                  </>
                )}
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{row.title || row.url}</p>
                        {row.title && (
                          <p className="text-xs text-muted-foreground truncate">{row.url}</p>
                        )}
                      </div>
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={dialogKind === "link"} onOpenChange={(o) => !o && setDialogKind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Virtual tour"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-url">URL</Label>
              <Input
                id="resource-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!url.trim() || createResource.isPending}
              onClick={() => void handleAddLink()}
            >
              Save link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
