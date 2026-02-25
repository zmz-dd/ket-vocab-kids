import { cn } from "@/lib/utils";

export function Bi({ en, zh, className }: { en: string; zh: string; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className="text-sm font-semibold">{en}</span>
      <span className="text-[11px] text-muted-foreground">{zh}</span>
    </span>
  );
}

export function BiTitle({ en, zh }: { en: string; zh: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-2xl font-black tracking-tight">{en}</div>
      <div className="text-sm text-muted-foreground">{zh}</div>
    </div>
  );
}
