import { useMemo, useState } from "react";
import {
  Bell,
  Camera,
  CameraOff,
  Copy,
  Crown,
  Gamepad2,
  Mic,
  MicOff,
  MoreVertical,
  Pin,
  Search,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { UserAvatar } from "./Avatar";
import { ChatPanel } from "./ChatPanel";
import { InfoPanel } from "./InfoPanel";

export function ParticipantsDrawer({
  open,
  onOpenChange,
  tab,
  onTabChange,
  participants,
  max,
  currentUserId,
  roomCode,
  onKick,
  onTransferHost,
  onTransferController,
  onToggleMute,
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => participants.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [participants, q],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass flex w-full flex-col gap-0 border-l-glass-border p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-glass-border px-5 py-4">
          <SheetTitle className="text-base">Room</SheetTitle>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => onTabChange(v)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 grid h-10 w-auto grid-cols-3 rounded-full bg-muted/60 p-1">
            <TabsTrigger value="room" className="rounded-full text-xs font-semibold uppercase tracking-wider">
              Room
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-full text-xs font-semibold uppercase tracking-wider">
              Chat
            </TabsTrigger>
            <TabsTrigger value="info" className="rounded-full text-xs font-semibold uppercase tracking-wider">
              Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="room" className="mt-0 flex flex-1 flex-col overflow-hidden">
            <div className="space-y-3 px-4 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search people…"
                  className="glass h-10 rounded-full border-glass-border pl-9"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{participants.length}</span>{" "}
                  / {max} in room
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1.5 rounded-full"
                  onClick={() => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${roomCode}`;
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(url).catch(() => {});
                    }
                    toast.success("Invite link copied");
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-2">
              <ul className="space-y-1 px-2 pb-6">
                {filtered.map((p) => (
                  <li
                    key={p.id}
                    className="glass flex items-center gap-3 rounded-2xl border-glass-border/60 p-3 transition hover:bg-white/5"
                  >
                    <UserAvatar user={p} size="md" speaking={p.speaking} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        {p.id === currentUserId && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                            you
                          </span>
                        )}
                        {p.role === "host" && <RoleBadge icon={Crown} label="Host" tone="host" />}
                        {p.role === "controller" && (
                          <RoleBadge icon={Gamepad2} label="Controller" tone="ctrl" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <StatusDot on={p.online} />
                        {p.joinedAgo}
                        {p.handRaised && <span className="text-primary">· ✋ raised</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span title={p.micOn ? "Mic on" : "Muted"}>
                        {p.micOn ? (
                          <Mic className="h-4 w-4 text-success" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </span>
                      <span title={p.camOn ? "Camera on" : "Camera off"}>
                        {p.camOn ? (
                          <Camera className="h-4 w-4 text-success" />
                        ) : (
                          <CameraOff className="h-4 w-4" />
                        )}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => toast(`Pinged ${p.name}`)}>
                            <Bell className="mr-2 h-4 w-4" /> Ping
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast(`Pinned ${p.name}`)}>
                            <Pin className="mr-2 h-4 w-4" /> Pin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleMute(p.id)}>
                            {p.micOn ? (
                              <MicOff className="mr-2 h-4 w-4" />
                            ) : (
                              <Mic className="mr-2 h-4 w-4" />
                            )}
                            {p.micOn ? "Mute" : "Unmute"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onTransferHost(p.id)}>
                            <Crown className="mr-2 h-4 w-4" /> Transfer host
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTransferController(p.id)}>
                            <Gamepad2 className="mr-2 h-4 w-4" /> Transfer controller
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              onKick(p.id);
                              toast.success(`${p.name} removed`);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="mr-2 h-4 w-4" /> Kick
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <div className="border-t border-glass-border p-4">
              <Button
                variant="secondary"
                className="h-10 w-full gap-2 rounded-full"
                onClick={() => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${roomCode}`;
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(url).catch(() => {});
                  }
                  toast.success("Invite link copied");
                }}
              >
                <Copy className="h-4 w-4" /> Copy invite · {roomCode}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-0 flex flex-1 flex-col overflow-hidden">
            <ChatPanel participants={participants} currentUserId={currentUserId} />
          </TabsContent>

          <TabsContent value="info" className="mt-0 flex flex-1 flex-col overflow-hidden">
            <InfoPanel participants={participants} roomCode={roomCode} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function RoleBadge({ icon: Icon, label, tone }) {
  const cls =
    tone === "host"
      ? "bg-amber-500/15 text-amber-400"
      : "bg-primary/20 text-primary";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${cls}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function StatusDot({ on }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-success" : "bg-muted-foreground/40"}`}
    />
  );
}
