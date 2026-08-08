import { Link } from "@tanstack/react-router";
import { Copy, LogOut, Hand, Settings, Users2, Video, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function RoomHeader({
  roomName,
  roomCode,
  connected,
  onlineCount,
  onOpenParticipants,
  onOpenCameras,
  onOpenPrefs,
  onRaiseHand,
}) {
  const copyInvite = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${roomCode}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    toast.success("Invite copied", { description: url });
  };

  return (
    <header className="glass sticky top-0 z-40 flex items-center gap-3 border-b border-glass-border px-3 py-2.5 sm:px-5">
      <Link to="/" className="flex shrink-0 items-center gap-2.5">
        <div className="glow-primary grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow">
          <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="hidden text-base font-bold tracking-tight sm:inline">SyncRoom</span>
      </Link>

      <div className="hidden h-6 w-px bg-glass-border sm:block" />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold sm:text-base">{roomName}</h1>
          <span className="hidden rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            {roomCode}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${connected ? "bg-success" : "bg-destructive"}`}
          />
          <span className="text-[11px] text-muted-foreground">
            {connected ? "Connected" : "Reconnecting…"} · {onlineCount} online
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenCameras}
          className="hidden gap-1.5 rounded-full md:inline-flex"
        >
          <Video className="h-4 w-4" /> Cameras
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenParticipants}
          className="hidden gap-1.5 rounded-full md:inline-flex"
        >
          <Users2 className="h-4 w-4" /> People
        </Button>
        <Button size="sm" variant="secondary" onClick={copyInvite} className="gap-1.5 rounded-full">
          <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Invite</span>
        </Button>
        <Button size="icon" variant="ghost" onClick={onRaiseHand} className="rounded-full">
          <Hand className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onOpenPrefs} className="rounded-full">
          <Settings className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="destructive" asChild className="gap-1.5 rounded-full">
          <Link to="/">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
