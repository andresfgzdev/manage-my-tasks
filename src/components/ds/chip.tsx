import { cn } from "@/lib/utils";

type Tone = "sodium" | "neutral" | "hint";

const TONES: Record<Tone, string> = {
  sodium: "border border-sodium/30 bg-sodium/10 text-sodium-soft",
  neutral: "border border-line bg-raise text-bone",
  hint: "border border-dashed border-line text-ash",
};

export function Chip({
  tone,
  kind,
  children,
}: {
  tone: Tone;
  kind?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] animate-chip-in items-center gap-1.5 rounded-chip px-[9px] font-mono text-xs",
        TONES[tone],
      )}
    >
      {kind && <span className="text-ash">{kind}</span>}
      {children}
    </span>
  );
}
