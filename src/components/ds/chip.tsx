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
  onClick,
  title,
  children,
}: {
  tone: Tone;
  kind?: string;
  // A chip with a handler is a button (the hint chips insert their syntax).
  onClick?(): void;
  title?: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-[26px] animate-chip-in items-center gap-1.5 rounded-chip px-[9px] font-mono text-xs",
    TONES[tone],
  );
  const content = (
    <>
      {kind && <span className="text-ash">{kind}</span>}
      {children}
    </>
  );
  if (!onClick) {
    return (
      <span className={className} title={title}>
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        className,
        "press cursor-pointer transition-[background-color,border-color,color] duration-150 hover:border-sodium/50 hover:text-bone focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none",
      )}
    >
      {content}
    </button>
  );
}
