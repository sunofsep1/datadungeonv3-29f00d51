import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DrakoSpeechBubbleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DrakoSpeechBubble({ text, className, style }: DrakoSpeechBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "pointer-events-none relative z-20 max-w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-center text-xs font-medium leading-snug text-foreground shadow-lg backdrop-blur-sm break-words [overflow-wrap:anywhere] line-clamp-3",
        className,
      )}
      style={style}
    >
      {text}
      <div
        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-border/80"
        aria-hidden
      />
    </motion.div>
  );
}
