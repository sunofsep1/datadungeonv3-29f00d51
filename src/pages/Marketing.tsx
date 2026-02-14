import * as React from "react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Calendar, FileText, Pencil, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePosts, useCreatePost, useUpdatePost, useDeletePost, Post } from "@/hooks/usePosts";
import { useContacts } from "@/hooks/useContacts";
import { MarketingBudgetCalculator } from "@/components/marketing/MarketingBudgetCalculator";
import { CampaignEmailDialog } from "@/components/marketing/CampaignEmailDialog";
import { ContentCalendar } from "@/components/agent-ops/ContentCalendar";
import { CampaignManager } from "@/components/agent-ops/CampaignManager";
import { format } from "date-fns";

export default function Marketing() {
  const { data: posts = [], isLoading } = usePosts();
  const { data: contacts = [] } = useContacts();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaignEmailOpen, setCampaignEmailOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    platform: "facebook",
    status: "draft",
    scheduled_date: "",
  });

  const handleOpenDialog = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        content: post.content || "",
        platform: post.platform || "facebook",
        status: post.status || "draft",
        scheduled_date: post.scheduled_date ? format(new Date(post.scheduled_date), "yyyy-MM-dd") : "",
      });
    } else {
      setEditingPost(null);
      setFormData({ title: "", content: "", platform: "facebook", status: "draft", scheduled_date: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }

    try {
      const data = {
        title: formData.title,
        content: formData.content || null,
        platform: formData.platform,
        status: formData.status,
        scheduled_date: formData.scheduled_date || null,
      };

      if (editingPost) {
        await updatePost.mutateAsync({ id: editingPost.id, ...data });
        toast({ title: "Success", description: "Post updated!" });
      } else {
        await createPost.mutateAsync(data);
        toast({ title: "Success", description: "Post created!" });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save post", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePost.mutateAsync(id);
      toast({ title: "Deleted", description: "Post removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "published": return "bg-success/20 text-success";
      case "scheduled": return "bg-info/20 text-info";
      case "draft": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case "facebook": return "📘";
      case "instagram": return "📸";
      case "linkedin": return "💼";
      case "email": return "📧";
      default: return "📝";
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Marketing"
        description="Plan campaigns, track ROI, and manage your marketing budget"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingPost(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" /> Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] bg-[#242424] border-white/10">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Edit Post" : "Create Post"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input placeholder="Post title" className="bg-input" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea placeholder="Write your content..." className="bg-input min-h-[100px]" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                      <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Schedule Date</Label>
                  <Input type="date" className="bg-input" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={createPost.isPending || updatePost.isPending}>
                  {(createPost.isPending || updatePost.isPending) ? "Saving..." : editingPost ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="budget" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="budget">Budget Calculator</TabsTrigger>
          <TabsTrigger value="posts">Posts & Campaigns</TabsTrigger>
          <TabsTrigger value="campaigns">Email Campaigns</TabsTrigger>
          <TabsTrigger value="calendar">Content Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="budget">
          <MarketingBudgetCalculator />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Send one email to multiple contacts.</p>
            <Button variant="outline" className="gap-2" onClick={() => setCampaignEmailOpen(true)}>
              <Mail className="w-4 h-4" /> Send campaign email
            </Button>
          </div>
          <CampaignManager />
          <CampaignEmailDialog
            open={campaignEmailOpen}
            onOpenChange={setCampaignEmailOpen}
            contacts={contacts}
          />
        </TabsContent>

        <TabsContent value="posts">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input placeholder="Search posts..." className="pl-10 bg-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No posts yet. Create your first post!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="zoho-card p-4 border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPlatformIcon(post.platform)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(post)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-medium text-white mb-2 line-clamp-2">{post.title}</h4>
                  {post.content && <p className="text-sm text-white/60 line-clamp-3 mb-3">{post.content}</p>}
                  {post.scheduled_date && (
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(post.scheduled_date), "MMM d, yyyy")}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <ContentCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
