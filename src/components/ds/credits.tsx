import { cn } from "@/lib/utils";

export function Credits({ className }: { className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] text-ash-dim", className)}>
      Made with{" "}
      <span aria-label="love" role="img" className="text-sodium">
        ♥
      </span>{" "}
      by{" "}
      <a
        href="https://github.com/andresfgzdev"
        target="_blank"
        rel="noreferrer"
        className="rounded-sm text-ash underline decoration-line underline-offset-[3px] transition-colors hover:text-bone hover:decoration-sodium focus-visible:ring-2 focus-visible:ring-sodium/60 focus-visible:outline-none"
      >
        Andres Gallego
      </a>
    </p>
  );
}
