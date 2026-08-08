import { CameraOff, Maximize2, Mic, MicOff, Pin, PinOff, Camera } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "./Avatar";
import { cn } from "@/lib/utils";

export function VideoCallDrawer({
  open,
  onOpenChange,
  participants,
  pinnedId,
  onPin,
  onToggleMute,
  onToggleCam,
}) {
  const withCam = participants.filter((p) => p.camOn);
  const pinned = participants.find((p) => p.id === pinnedId) ?? withCam[0] ?? participants[0];
  const rest = participants.filter((p) => p.id !== pinned?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass flex w-full flex-col gap-0 border-l-glass-border p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-glass-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-primary" /> Cameras
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              {withCam.length} on
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4">
          {pinned && (
            <CameraTile
              user={pinned}
              large
              pinned
              onPin={() => onPin(null)}
              onToggleMute={onToggleMute}
              onToggleCam={onToggleCam}
            />
          )}
        </div>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            {rest.map((p) => (
              <CameraTile
                key={p.id}
                user={p}
                onPin={() => onPin(p.id)}
                onToggleMute={onToggleMute}
                onToggleCam={onToggleCam}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CameraTile({ user, large, pinned, onPin, onToggleMute, onToggleCam }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card ring-1 ring-inset ring-white/10",
        large ? "aspect-video" : "aspect-square",
      )}
    >
      {user.camOn ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${user.color}, oklch(0.14 0.02 275) 75%)`,
          }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-background">
          <UserAvatar user={user} size={large ? "lg" : "md"} />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-2.5 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-1.5">
          {user.micOn ? (
            <Mic className="h-3 w-3 shrink-0 text-success" />
          ) : (
            <MicOff className="h-3 w-3 shrink-0 text-destructive" />
          )}
          <span className="truncate font-medium text-white">{user.name}</span>
        </div>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full" onClick={() => onToggleMute(user.id)}>
            {user.micOn ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full" onClick={() => onToggleCam(user.id)}>
            {user.camOn ? <CameraOff className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full" onClick={onPin}>
            {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
          {!large && (
            <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full" onClick={onPin}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {pinned && (
        <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
          Pinned
        </span>
      )}
    </div>
  );
}
