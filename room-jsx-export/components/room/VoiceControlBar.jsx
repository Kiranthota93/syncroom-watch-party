import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function VoiceControlBar({
  joined,
  muted,
  speakerMuted,
  disabled,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleSpeaker,
}) {
  if (!joined) {
    return (
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
        <Button
          onClick={onJoin}
          className="glow-primary pointer-events-auto h-11 gap-2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-5 text-sm font-semibold shadow-elevated"
        >
          <Radio className="h-4 w-4" />
          Join Voice
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <div
        className={cn(
          "glass pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5 shadow-elevated",
          disabled && "opacity-70",
        )}
      >
        <div className="flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5">
          <div className="flex h-4 items-end gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="animate-speaking-bar w-0.5 rounded-full bg-success"
                style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-success">
            {disabled ? "Voice paused" : "Live"}
          </span>
        </div>
        <Button
          size="icon"
          variant={muted ? "destructive" : "secondary"}
          onClick={onToggleMute}
          className="h-10 w-10 rounded-full"
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={onToggleSpeaker}
          className="h-10 w-10 rounded-full"
        >
          {speakerMuted ? (
            <HeadphoneOff className="h-4 w-4" />
          ) : (
            <Headphones className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="destructive"
          onClick={onLeave}
          className="h-10 w-10 rounded-full"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
