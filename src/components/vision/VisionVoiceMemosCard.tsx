import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Square, Loader2, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { VisionDeskMemo } from "@/lib/visionDeskNotes";
import { format } from "date-fns";

const BUCKET = "vision-board";
const SIGNED_SEC = 60 * 60 * 24;

/** Prefer a MIME type the browser actually supports; Safari often needs audio/mp4. */
function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/aac",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function createRecorder(stream: MediaStream): MediaRecorder {
  const mime = pickMime();
  if (mime) {
    try {
      return new MediaRecorder(stream, { mimeType: mime });
    } catch {
      /* try default */
    }
  }
  return new MediaRecorder(stream);
}

function extForRecorderMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("mp4") || m.includes("aac") || m.includes("mpeg")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  return "webm";
}

type VisionVoiceMemosCardProps = {
  visionCardId: string;
  memos: VisionDeskMemo[];
  onMemosChange: (next: VisionDeskMemo[]) => void;
  disabled?: boolean;
};

export function VisionVoiceMemosCard({ visionCardId, memos, onMemosChange, disabled }: VisionVoiceMemosCardProps) {
  const { user } = useAuth();
  const paths = memos.map((m) => m.path);
  const { data: urlByPath = {} } = useQuery({
    queryKey: ["vision-memo-signed", BUCKET, ...paths],
    queryFn: async () => {
      const out: Record<string, string> = {};
      for (const path of paths) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_SEC);
        if (!error && data?.signedUrl) out[path] = data.signedUrl;
      }
      return out;
    },
    enabled: paths.length > 0,
  });

  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedMimeRef = useRef<string>("audio/webm");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      mediaRecorderRef.current?.stop();
    };
  }, [stopStream]);

  const startRecording = async () => {
    if (!user || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = createRecorder(stream);
      mediaRecorderRef.current = rec;
      recordedMimeRef.current = (rec.mimeType && rec.mimeType.length > 0 ? rec.mimeType : pickMime()) || "audio/webm";
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        toast.error("Recording error");
        setRecording(false);
        stopStream();
      };
      rec.start(250);
      setRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/not allowed|permission|denied/i.test(msg)) {
        toast.error("Microphone access denied");
      } else if (/not found|devices? not found/i.test(msg)) {
        toast.error("No microphone found");
      } else {
        toast.error(`Could not start recording: ${msg}`);
      }
      stopStream();
    }
  };

  const finishRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      stopStream();
      return;
    }
    // Stop the MediaStream only after the recorder has flushed its final chunks;
    // stopping tracks immediately after rec.stop() often yields an empty blob.
    rec.onstop = () => {
      stopStream();
      void handleUploadBlob();
    };
    if (rec.state === "recording") {
      try {
        rec.requestData();
      } catch {
        /* ignore */
      }
    }
    rec.stop();
    setRecording(false);
  };

  const handleUploadBlob = async () => {
    if (!user) return;
    const mime = recordedMimeRef.current || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    if (blob.size < 64) {
      toast.message("Nothing recorded", { description: "Try again and hold record a little longer." });
      return;
    }
    setUploading(true);
    try {
      const ext = extForRecorderMime(mime);
      const path = `${user.id}/${visionCardId}/voice-${Date.now()}.${ext}`;
      const file = new File([blob], `memo.${ext}`, { type: mime });
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const memo: VisionDeskMemo = { path, createdAt: new Date().toISOString() };
      onMemosChange([...memos, memo]);
      toast.success("Voice memo saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const removeMemo = async (path: string) => {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch {
      /* still drop from list */
    }
    onMemosChange(memos.filter((m) => m.path !== path));
  };

  return (
    <Card className="zoho-card border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Voice memos</h3>
        <div className="flex gap-1">
          {!recording ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1"
              disabled={disabled || uploading || !user}
              onClick={() => void startRecording()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
              Record
            </Button>
          ) : (
            <Button type="button" size="sm" variant="destructive" className="gap-1" onClick={finishRecording}>
              <Square className="h-3 w-3 fill-current" />
              Stop
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Quick voice capture for ideas while you are planning. Memos are stored privately on your vision card.
      </p>
      {memos.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No memos yet.</p>
      ) : (
        <ul className="space-y-2">
          {memos.map((m) => {
            const url = urlByPath[m.path];
            const when = (() => {
              const d = new Date(m.createdAt);
              return Number.isNaN(d.getTime()) ? "" : format(d, "d MMM yyyy, h:mm a");
            })();
            return (
              <li
                key={m.path}
                className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-2"
              >
                {url ? (
                  <audio controls src={url} className="flex-1 min-w-0 h-8 max-h-10" />
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 py-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </span>
                )}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {when ? <span className="text-[10px] text-muted-foreground whitespace-nowrap">{when}</span> : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    onClick={() => void removeMemo(m.path)}
                    aria-label="Delete memo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
