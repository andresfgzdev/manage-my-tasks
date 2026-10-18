export function NowMarker({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={`Now, ${label}`} className="flex h-7 items-center">
      <span className="w-[52px] text-right font-mono text-xs text-sodium">{label}</span>
      <span className="relative ml-2.5 size-[9px] shrink-0 rounded-full bg-sodium before:absolute before:inset-0 before:animate-[now-ring_2400ms_ease-out_infinite] before:rounded-full before:bg-sodium before:opacity-0" />
      <span className="h-px flex-1 bg-linear-to-r from-sodium to-transparent" />
    </div>
  );
}
