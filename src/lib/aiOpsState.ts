import type { AIOpsActionStatus } from "@/hooks/useAIActions";

const ALLOWED_NEXT: Record<AIOpsActionStatus, AIOpsActionStatus[]> = {
  pending: ["confirmed", "cancelled", "executing"],
  confirmed: ["executing", "cancelled"],
  executing: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: ["confirmed", "cancelled"],
  cancelled: [],
};

export function canTransitionAIOpsStatus(from: AIOpsActionStatus, to: AIOpsActionStatus): boolean {
  return ALLOWED_NEXT[from].includes(to);
}
