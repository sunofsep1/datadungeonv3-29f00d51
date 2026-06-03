/**
 * DrakoTraining.tsx — "Drako's Trials"
 * An in-CRM, multiple-choice training game for Australian real estate.
 *
 * Reuses the existing Drako layer:
 *   - useDrako().setMood(mood, { caption })  → Drako reacts to answers
 *   - useDrakoProgress().grantXp(source)     → real XP feeds the level system
 *
 * Flow: pick a category (or Random) → answer N questions → see results.
 * Scoring: correct answers build a streak; 3+ streak triggers a fire-breath.
 * Best score per category persists in localStorage.
 *
 * NOTE: content is sales-coaching/training, not legal advice. Rules vary by
 * state/territory — a disclaimer is shown in the UI.
 */

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Shield,
  Scroll,
  Scale,
  Handshake,
  Flame,
  Trophy,
  Heart,
  RotateCcw,
  ChevronRight,
  Check,
  X,
  Shuffle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDrako } from "@/components/drako";
import { useDrakoProgress } from "@/hooks/useDrakoProgress";
import { useGameMode } from "@/hooks/useGameMode";
import { recordDrakoActivity } from "@/lib/drakoActivity";
import {
  CATEGORY_META,
  QUESTIONS,
  questionsForCategory,
  type TrainingCategory,
  type TrainingQuestion,
} from "@/lib/drakoTrainingQuestions";

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const ROUND_SIZE = 8; // questions per round
const STARTING_LIVES = 3;
const STREAK_FOR_BLAZE = 3; // streak length that triggers a Drako fire-breath
const BEST_KEY = "drako_training_best_v1";

const ICONS = { shield: Shield, scroll: Scroll, scale: Scale, handshake: Handshake } as const;

type Phase = "menu" | "playing" | "results";
type SelectedCategory = TrainingCategory | "all";

interface BestScores {
  [key: string]: number; // category id (or "all") -> best correct count
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadBest(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as BestScores) : {};
  } catch {
    return {};
  }
}

function saveBest(scores: BestScores): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
}

function buildRound(cat: SelectedCategory): TrainingQuestion[] {
  const pool = cat === "all" ? QUESTIONS : questionsForCategory(cat);
  return shuffle(pool).slice(0, Math.min(ROUND_SIZE, pool.length));
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function DrakoTraining() {
  const { gameModeEnabled } = useGameMode();
  const { setMood } = useDrako();
  const { grantXp } = useDrakoProgress();

  const [phase, setPhase] = useState<Phase>("menu");
  const [category, setCategory] = useState<SelectedCategory>("all");
  const [round, setRound] = useState<TrainingQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false); // answer submitted, showing feedback
  const [correctCount, setCorrectCount] = useState(0);
  const correctCountRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [best, setBest] = useState<BestScores>(() => loadBest());

  const current = round[index];
  const progressPct = round.length ? Math.round((index / round.length) * 100) : 0;

  const startRound = useCallback(
    (cat: SelectedCategory) => {
      setCategory(cat);
      setRound(buildRound(cat));
      setIndex(0);
      setSelected(null);
      setLocked(false);
      correctCountRef.current = 0;
      setCorrectCount(0);
      setStreak(0);
      setBestStreak(0);
      setLives(STARTING_LIVES);
      setPhase("playing");
      setMood("wave", {
        caption: "Trial begins. Choose wisely, operator.",
      });
    },
    [setMood],
  );

  const finishRound = useCallback(
    (finalCorrect: number) => {
      setPhase("results");
      recordDrakoActivity("training");
      const key = category;
      const prevBest = best[key] ?? 0;
      if (finalCorrect > prevBest) {
        const next = { ...best, [key]: finalCorrect };
        setBest(next);
        saveBest(next);
      }
      const passed = finalCorrect >= Math.ceil(round.length * 0.6);
      if (passed) {
        // A full passing round counts as a meaningful CRM action.
        grantXp("pipelineAdvance");
        setMood("fire-breath", {
          caption:
            finalCorrect === round.length
              ? "FLAWLESS RUN. The dungeon bows to you."
              : "Trial cleared. Knowledge level rising.",
        });
      } else {
        setMood("sleeping", {
          caption: "Trial over. Rest, then run it again — you'll sharpen fast.",
        });
      }
    },
    [best, category, grantXp, round.length, setMood],
  );

  const submitAnswer = useCallback(
    (choice: number) => {
      if (locked || !current) return;
      setSelected(choice);
      setLocked(true);

      const isCorrect = choice === current.correctIndex;
      if (isCorrect) {
        const newStreak = streak + 1;
        const newCorrect = correctCountRef.current + 1;
        correctCountRef.current = newCorrect;
        setStreak(newStreak);
        setBestStreak((b) => Math.max(b, newStreak));
        setCorrectCount(newCorrect);
        grantXp("taskDone"); // real XP into Drako's level system

        if (newStreak >= STREAK_FOR_BLAZE) {
          setMood("fire-breath", { caption: `${newStreak} in a row — on fire!` });
        } else {
          setMood("celebrate", { caption: "Correct. +50 XP." });
        }
      } else {
        setStreak(0);
        setLives((l) => l - 1);
        setMood("confused", { caption: "Not quite — read the why below." });
      }
    },
    [current, grantXp, locked, setMood, streak],
  );

  const next = useCallback(() => {
    const wasLastQuestion = index + 1 >= round.length;
    const outOfLives = lives <= 0;
    if (wasLastQuestion || outOfLives) {
      finishRound(correctCountRef.current);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setLocked(false);
  }, [finishRound, index, lives, round.length]);

  if (!gameModeEnabled) {
    return <Navigate to="/attention-hub" replace />;
  }

  // ----------------------------------------------------------------- RENDER

  return (
    <div className="animate-fade-in min-h-[60vh]">
      <PageHeader title="Drako's Trials" />
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Australian real estate training — answer, level up, and keep Drako breathing fire.
      </p>

      <AnimatePresence mode="wait">
        {phase === "menu" && (
          <MenuScreen key="menu" best={best} onStart={startRound} />
        )}

        {phase === "playing" && current && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <PlayHud
              index={index}
              total={round.length}
              progressPct={progressPct}
              lives={lives}
              streak={streak}
              correctCount={correctCount}
            />
            <QuestionCard
              question={current}
              selected={selected}
              locked={locked}
              onSelect={submitAnswer}
            />
            {locked && (
              <FeedbackPanel
                question={current}
                wasCorrect={selected === current.correctIndex}
                isLast={index + 1 >= round.length || lives <= 0}
                onNext={next}
              />
            )}
          </motion.div>
        )}

        {phase === "results" && (
          <ResultsScreen
            key="results"
            category={category}
            correctCount={correctCount}
            total={round.length}
            bestStreak={bestStreak}
            best={best[category] ?? 0}
            onReplay={() => startRound(category)}
            onMenu={() => setPhase("menu")}
          />
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Training content only — not legal advice. Compliance rules vary by state/territory and
        change over time; always verify against current legislation and agency policy.
      </p>
    </div>
  );
}

// --------------------------------------------------------------------------
// Menu
// --------------------------------------------------------------------------

function MenuScreen({
  best,
  onStart,
}: {
  best: BestScores;
  onStart: (cat: SelectedCategory) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="zoho-card mb-4 border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="h-4 w-4 text-primary" />
          <span>
            Pick a trial. Each run is up to {ROUND_SIZE} questions, {STARTING_LIVES} lives. Correct
            answers earn real XP and feed Drako's level.
          </span>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORY_META.map((meta) => {
          const Icon = ICONS[meta.icon];
          const bestScore = best[meta.id] ?? 0;
          return (
            <Card
              key={meta.id}
              className="zoho-card group flex flex-col gap-3 border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.blurb}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between">
                {bestScore > 0 ? (
                  <Badge variant="outline" className="gap-1 border-border/70 text-[10px]">
                    <Trophy className="h-3 w-3 text-primary" />
                    Best {bestScore}/{ROUND_SIZE}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Not attempted</span>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => onStart(meta.id)}>
                  Start <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        variant="secondary"
        className="mt-3 w-full gap-2"
        onClick={() => onStart("all")}
      >
        <Shuffle className="h-4 w-4" />
        Random mix — all categories
      </Button>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// In-game HUD
// --------------------------------------------------------------------------

function PlayHud({
  index,
  total,
  progressPct,
  lives,
  streak,
  correctCount,
}: {
  index: number;
  total: number;
  progressPct: number;
  lives: number;
  streak: number;
  correctCount: number;
}) {
  return (
    <Card className="zoho-card mb-3 border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Question {index + 1} / {total}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs">
            {Array.from({ length: STARTING_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < lives ? "fill-destructive text-destructive" : "text-muted-foreground/40",
                )}
              />
            ))}
          </span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Flame className="h-3.5 w-3.5" />
              {streak}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{correctCount} correct</span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Question card
// --------------------------------------------------------------------------

function QuestionCard({
  question,
  selected,
  locked,
  onSelect,
}: {
  question: TrainingQuestion;
  selected: number | null;
  locked: boolean;
  onSelect: (i: number) => void;
}) {
  const catMeta = CATEGORY_META.find((c) => c.id === question.category);
  return (
    <Card className="zoho-card border border-border p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        {catMeta && (
          <Badge variant="outline" className="border-border/70 text-[10px] uppercase tracking-wide">
            {catMeta.label}
          </Badge>
        )}
        <Badge variant="outline" className="border-border/70 text-[10px]">
          {"★".repeat(question.difficulty)}
        </Badge>
      </div>

      <p className="mb-4 text-[15px] font-medium leading-snug text-foreground">
        {question.prompt}
      </p>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isChosen = selected === i;
          const isAnswer = i === question.correctIndex;
          const showCorrect = locked && isAnswer;
          const showWrong = locked && isChosen && !isAnswer;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => onSelect(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                "border-border bg-background/60 hover:border-primary/40 hover:bg-muted/40",
                showCorrect && "border-emerald-500/60 bg-emerald-500/10",
                showWrong && "border-destructive/60 bg-destructive/10",
                locked && !showCorrect && !showWrong && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                  showCorrect && "border-emerald-500 text-emerald-600",
                  showWrong && "border-destructive text-destructive",
                  !locked && "border-border text-muted-foreground",
                )}
              >
                {showCorrect ? (
                  <Check className="h-4 w-4" />
                ) : showWrong ? (
                  <X className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Feedback panel (after answering)
// --------------------------------------------------------------------------

function FeedbackPanel({
  question,
  wasCorrect,
  isLast,
  onNext,
}: {
  question: TrainingQuestion;
  wasCorrect: boolean;
  isLast: boolean;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "zoho-card mt-3 border p-4",
          wasCorrect ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
        )}
      >
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
          {wasCorrect ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600">Correct</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">Not quite</span>
            </>
          )}
        </div>
        <p className="text-sm leading-snug text-foreground/90">{question.explanation}</p>
        <div className="mt-3 flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={onNext}>
            {isLast ? "See results" : "Next question"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Results
// --------------------------------------------------------------------------

function ResultsScreen({
  category,
  correctCount,
  total,
  bestStreak,
  best,
  onReplay,
  onMenu,
}: {
  category: SelectedCategory;
  correctCount: number;
  total: number;
  bestStreak: number;
  best: number;
  onReplay: () => void;
  onMenu: () => void;
}) {
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const passed = correctCount >= Math.ceil(total * 0.6);
  const label =
    category === "all"
      ? "Random Mix"
      : CATEGORY_META.find((c) => c.id === category)?.label ?? "Trial";

  let grade = "Keep training";
  if (pct === 100) grade = "Flawless — dragon-rank";
  else if (pct >= 80) grade = "Sharp operator";
  else if (pct >= 60) grade = "Solid — trial cleared";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="zoho-card border border-border p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          {passed ? (
            <Trophy className="h-7 w-7 text-primary" />
          ) : (
            <RotateCcw className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-foreground">{label} — {grade}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You scored <span className="font-semibold text-foreground">{correctCount}/{total}</span>{" "}
          ({pct}%)
        </p>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
          <Stat label="Correct" value={`${correctCount}`} />
          <Stat label="Best streak" value={`${bestStreak}`} icon={<Flame className="h-3 w-3" />} />
          <Stat label="Personal best" value={`${Math.max(best, correctCount)}`} />
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={onReplay} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            Run it again
          </Button>
          <Button variant="outline" onClick={onMenu}>
            Choose another trial
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center justify-center gap-1 text-base font-semibold text-foreground">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
