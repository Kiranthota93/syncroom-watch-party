import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  PictureInPicture,
  SkipBack,
  SkipForward,
  Youtube,
  Film,
  MonitorPlay,
  Radio,
  Link2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reactionSet } from "@/lib/room/mock-data";

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const sourceMeta = {
  none: { label: "No source", icon: Film },
  youtube: { label: "YouTube", icon: Youtube },
  local: { label: "Local Video", icon: Film },
  screen: { label: "Screen Share", icon: MonitorPlay },
  live: { label: "Live Stream", icon: Radio },
};

export function VideoStage({
  source,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  reactions,
  onReact,
  onLoad,
}) {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(75);
  const Meta = sourceMeta[source];

  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-5 lg:p-6">
        <div
          className={cn(
            "glass relative aspect-video w-full max-w-[1600px] overflow-hidden rounded-3xl shadow-elevated",
            "ring-1 ring-inset ring-white/5",
          )}
        >
          <div className="glass absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full border-glass-border px-3 py-1 text-xs font-medium">
            <Meta.icon className="h-3.5 w-3.5 text-primary" />
            <span>{Meta.label}</span>
          </div>

          {source === "none" ? (
            <EmptyStage onLoad={onLoad} />
          ) : source === "youtube" ? (
            <SourcePrompt
              title="Paste a YouTube link"
              helper="Supports youtube.com and youtu.be links"
              placeholder="https://www.youtube.com/watch?v=…"
              cta="Load"
              icon={<Link2 className="h-6 w-6 text-primary-foreground" />}
              onLoad={onLoad}
            />
          ) : source === "local" ? (
            <SourcePrompt
              title="Select your video file"
              helper="Everyone loads the same file from their own device"
              placeholder="Choose file…"
              cta="Choose"
              icon={<Upload className="h-6 w-6 text-primary-foreground" />}
              onLoad={onLoad}
              file
            />
          ) : (
            <PlayingPoster />
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10">
            {reactions.map((r) => (
              <span
                key={r.id}
                className="animate-reaction-float absolute text-4xl"
                style={{ left: `${r.x}%` }}
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {source !== "none" && (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-16 sm:p-5 sm:pt-20">
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={(v) => onSeek(v[0] ?? 0)}
                className="mb-3"
              />
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-white hover:bg-white/10"
                  onClick={() => onSeek(Math.max(0, currentTime - 10))}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={onTogglePlay}
                  className="h-11 w-11 rounded-full bg-white text-black hover:bg-white/90"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-white hover:bg-white/10"
                  onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                <span className="ml-1 font-mono text-xs tabular-nums text-white/80">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>
                <div className="ml-auto flex items-center gap-1 sm:gap-2">
                  <div className="hidden items-center gap-2 sm:flex">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full text-white hover:bg-white/10"
                      onClick={() => setMuted((m) => !m)}
                    >
                      {muted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[muted ? 0 : volume]}
                      max={100}
                      onValueChange={(v) => {
                        setMuted(false);
                        setVolume(v[0] ?? 0);
                      }}
                      className="w-24"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/10"
                  >
                    <PictureInPicture className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full text-white hover:bg-white/10"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5 shadow-elevated">
          {reactionSet.map((r) => (
            <button
              key={r}
              onClick={() => onReact(r)}
              className="grid h-9 w-9 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-white/10 active:scale-95"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyStage({ onLoad }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-background via-background to-primary/10 p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="glow-primary mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary-glow">
          <Play className="h-8 w-8 fill-primary-foreground text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">No content selected yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a source below — your friends will see it instantly.
          </p>
        </div>
        <Button
          onClick={onLoad}
          className="glow-primary rounded-full bg-gradient-to-r from-primary to-primary-glow px-6"
        >
          Choose a source
        </Button>
      </div>
    </div>
  );
}

function SourcePrompt({ title, helper, placeholder, cta, icon, onLoad, file }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-background via-background to-primary/10 p-6">
      <div className="w-full max-w-lg space-y-5 text-center">
        <div className="glow-primary mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary-glow">
          {icon}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{helper}</p>
        {file ? (
          <Button
            onClick={onLoad}
            className="glow-primary mx-auto gap-2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-6"
          >
            <Upload className="h-4 w-4" /> {cta} file
          </Button>
        ) : (
          <div className="mx-auto flex max-w-md gap-2">
            <Input
              placeholder={placeholder}
              className="glass h-11 rounded-full border-glass-border px-5"
            />
            <Button
              onClick={onLoad}
              className="glow-primary h-11 rounded-full bg-gradient-to-r from-primary to-primary-glow px-6"
            >
              {cta}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayingPoster() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent 0%, oklch(0.1 0.02 275 / 0.65) 100%), radial-gradient(circle at 30% 40%, oklch(0.4 0.2 30 / 0.7), transparent 55%), radial-gradient(circle at 70% 60%, oklch(0.35 0.18 295 / 0.6), transparent 55%), linear-gradient(135deg, oklch(0.2 0.05 275), oklch(0.14 0.02 275))",
        }}
      />
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/10 backdrop-blur-xl">
          <Play className="h-6 w-6 fill-white text-white" />
        </div>
      </div>
    </div>
  );
}
