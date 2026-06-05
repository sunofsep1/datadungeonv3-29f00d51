import type { ElementType, ComponentProps } from "react";
import type { Theme, Density, FontSize } from "@/contexts/ThemeContext";
import {
  Sun,
  Moon,
  Droplets,
  Ghost,
  Code2,
  Atom,
  Sunset,
  Coffee,
  Contrast,
  Sparkles,
  Leaf,
  Waves,
  Flame,
  Mountain,
  Wind,
  Flower2,
  Palette,
  Snowflake,
} from "lucide-react";

export const THEME_OPTIONS: { value: Theme; label: string; icon: ElementType; desc?: string }[] = [
  { value: "dark", label: "Dark (Classic)", icon: Moon, desc: "Original dark theme." },
  { value: "darkPlus", label: "Dark+", icon: Moon, desc: "Readable dark theme with brighter surfaces." },
  { value: "light", label: "Light (Classic)", icon: Sun, desc: "Original light theme." },
  { value: "lightPlus", label: "Light+", icon: Sun, desc: "Softer light theme with stronger hierarchy." },
  { value: "midday", label: "Midday", icon: Sun, desc: "Balanced neutral mode between dark and light." },
  { value: "middayCool", label: "Midday Cool", icon: Droplets, desc: "Cool grey-blue midday blend." },
  { value: "middayNeutral", label: "Midday Neutral", icon: Sun, desc: "Balanced neutral gray midday blend." },
  { value: "middayWarm", label: "Midday Warm", icon: Sunset, desc: "Warm stone midday blend." },
  { value: "middayGregSoft", label: "Greg Pick: Soft Midday", icon: Coffee, desc: "Low-glare warm midday for long sessions." },
  { value: "middayGregCrisp", label: "Greg Pick: Crisp Midday", icon: Contrast, desc: "Sharper midday contrast for dense data screens." },
  { value: "latte", label: "Latte", icon: Coffee, desc: "Warm light beige with soft brown accents." },
  { value: "dawn", label: "Dawn", icon: SunriseIcon, desc: "Rosy morning light with gentle contrast." },
  { value: "mint", label: "Mint", icon: Leaf, desc: "Fresh mint light theme with green accents." },
  { value: "sky", label: "Sky", icon: Droplets, desc: "Airy blue light theme with cool tones." },
  { value: "sand", label: "Sand", icon: Sunset, desc: "Soft sand light theme with golden accents." },
  { value: "tomorrowNightBlue", label: "Tomorrow Night Blue", icon: Droplets, desc: "Blue-tinted dark theme (VS Code)." },
  { value: "dracula", label: "Dracula", icon: Ghost, desc: "Purple & pink accents." },
  { value: "monokai", label: "Monokai", icon: Palette, desc: "Teal & orange (Sublime Text)." },
  { value: "githubDark", label: "GitHub Dark", icon: Code2, desc: "Near-black with blue accents." },
  { value: "oneDark", label: "One Dark", icon: Atom, desc: "Atom / One Dark Pro style." },
  { value: "solarizedDark", label: "Solarized Dark", icon: Sunset, desc: "Dark teal background." },
  { value: "nord", label: "Nord", icon: Snowflake, desc: "Cool greys and blues." },
  { value: "catppuccin", label: "Catppuccin Mocha", icon: Coffee, desc: "Soft pastel dark theme." },
  { value: "highContrast", label: "High contrast", icon: Contrast, desc: "Accessibility: strong contrast." },
  { value: "tokyoNight", label: "Tokyo Night", icon: Waves, desc: "Deep indigo, popular editor theme." },
  { value: "gruvbox", label: "Gruvbox Dark", icon: Palette, desc: "Retro warm brown & orange." },
  { value: "rosePine", label: "Rose Pine", icon: Flower2, desc: "Muted evergreen & rose." },
  { value: "synthwave", label: "Synthwave '84", icon: Sparkles, desc: "Retro neon pink & cyan." },
  { value: "ayuMirage", label: "Ayu Mirage", icon: Waves, desc: "Teal-dark with orange accents." },
  { value: "materialPalenight", label: "Material Palenight", icon: Atom, desc: "Material dark purple & cyan." },
  { value: "kanagawa", label: "Kanagawa", icon: Mountain, desc: "Japanese-inspired warm lotus." },
  { value: "oceanicNext", label: "Oceanic Next", icon: Wind, desc: "Deep ocean blue-green." },
  { value: "horizon", label: "Horizon", icon: Flame, desc: "Warm pink & coral accents." },
  { value: "everforest", label: "Everforest", icon: Leaf, desc: "Soft green forest theme." },
  { value: "neonArcade84", label: "Neon Arcade '84", icon: Sparkles, desc: "Retro arcade neon with readable mid-dark contrast." },
  { value: "miamiVice89", label: "Miami Vice '89", icon: Waves, desc: "Teal-magenta evening glow, inspired by late-80s synth style." },
  { value: "vhsAfterglow", label: "VHS Afterglow", icon: Moon, desc: "Dusty purple tape-era palette with soft highlights." },
  { value: "mallsoft95", label: "Mallsoft '95", icon: Sunset, desc: "Muted mauve and teal for a nostalgic 90s desktop feel." },
  { value: "cyberTeal96", label: "Cyber Teal '96", icon: Droplets, desc: "Blue-green cyber tones, crisp but not too dark." },
  { value: "floppyDiskBlue", label: "Floppy Disk Blue", icon: Code2, desc: "Cool cobalt workstation look with gentle contrast." },
  { value: "y2kIce", label: "Y2K Ice", icon: Snowflake, desc: "Frosted chrome-era blues for an early-2000s vibe." },
  { value: "cyberGrape2000", label: "Cyber Grape 2000", icon: Atom, desc: "Purple-plum UI inspired by turn-of-millennium tech." },
  { value: "matrixPastel", label: "Matrix Pastel", icon: Leaf, desc: "Soft green-on-slate that nods to late-90s terminals." },
  { value: "sunsetDrive", label: "Sunset Drive", icon: Flame, desc: "Warm peach and violet twilight dashboard palette." },
  { value: "dotcomSlate", label: "Dotcom Slate", icon: Contrast, desc: "Balanced slate neutrals with bright web-1.0 accents." },
  { value: "gameboyNight", label: "Gameboy Night", icon: Moon, desc: "Retro handheld greens in a modern mid-dark UI." },
  { value: "dreamcastBlue", label: "Dreamcast Blue", icon: Waves, desc: "Cool console-era cyan and orange contrast pops." },
  { value: "millenniumPurple", label: "Millennium Purple", icon: Flower2, desc: "Y2K lavender and indigo with soft readability." },
  { value: "retroWaveDusk", label: "Retrowave Dusk", icon: Sparkles, desc: "80s-inspired dusk gradient tones, mid-dark and vibrant." },
];

export const MIDDAY_THEME_VALUES: Theme[] = [
  "midday",
  "middayCool",
  "middayNeutral",
  "middayWarm",
  "middayGregSoft",
  "middayGregCrisp",
];

export const LIGHT_THEME_VALUES: Theme[] = ["light", "lightPlus", "latte", "dawn", "mint", "sky", "sand"];

export const DARK_THEME_VALUES: Theme[] = THEME_OPTIONS.map((opt) => opt.value).filter(
  (value) => !LIGHT_THEME_VALUES.includes(value) && !MIDDAY_THEME_VALUES.includes(value),
);

export const GREG_TOP_RETRO_DARK_THEMES: Theme[] = [
  "neonArcade84",
  "miamiVice89",
  "y2kIce",
  "millenniumPurple",
  "retroWaveDusk",
];

export const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "large", label: "Large" },
];

function SunriseIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 18h16" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M12 4v3" />
      <path d="m5 11 2 2" />
      <path d="m19 11-2 2" />
    </svg>
  );
}
