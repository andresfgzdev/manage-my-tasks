export function NowMarker({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={`Now, ${label}`} className="flex h-7 items-center">
      <span className="w-[52px] text-right font-mono text-xs text-sodium">{label}</span>
      <span className="ml-2.5 size-[9px] shrink-0 animate-[now-pulse_2400ms_ease-in-out_infinite] rounded-full bg-sodium" />
      <span className="h-px flex-1 bg-linear-to-r from-sodium to-transparent" />
    </div>
  );
}
