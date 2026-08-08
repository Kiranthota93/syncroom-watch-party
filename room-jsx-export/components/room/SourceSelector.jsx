import { Youtube, Film, MonitorPlay, Radio, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "local", label: "Local Video", icon: Film },
  { id: "screen", label: "Screen Share", icon: MonitorPlay, soon: true },
  { id: "live", label: "Live Stream", icon: Radio, soon: true },
];

export function SourceSelector({ current, onSelect }) {
  return (
    <div className="flex items-center gap-2 border-t border-glass-border/60 bg-background/60 px-4 py-3 backdrop-blur-xl">
      <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:inline">
        Source
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it) => {
          const active = current === it.id;
          return (
            <button
              key={it.id}
              onClick={() => !it.soon && onSelect(it.id)}
              disabled={it.soon}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-primary/40 bg-primary/15 text-foreground glow-primary"
                  : "border-glass-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground",
                it.soon && "cursor-not-allowed opacity-60",
              )}
            >
              <it.icon className="h-3.5 w-3.5" />
              {it.label}
              {active && <Check className="h-3 w-3 text-primary" />}
              {it.soon && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
