import { Crown, Gamepad2, Mic, Users2 } from "lucide-react";
import { UserAvatar } from "./Avatar";
import { Button } from "@/components/ui/button";

export function FloatingParticipantStrip({ host, controller, speaker, extra, onOpen }) {
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-30 sm:bottom-24 sm:right-6">
      <div className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-elevated">
        <StripTile user={host} label="Host" icon={<Crown className="h-3 w-3" />} />
        <div className="h-8 w-px bg-glass-border" />
        <StripTile
          user={controller}
          label="Controller"
          icon={<Gamepad2 className="h-3 w-3" />}
        />
        {speaker && (
          <>
            <div className="h-8 w-px bg-glass-border" />
            <StripTile
              user={speaker}
              label="Speaking"
              speaking
              icon={<Mic className="h-3 w-3" />}
            />
          </>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={onOpen}
          className="ml-1 h-9 gap-1.5 rounded-full"
        >
          <Users2 className="h-3.5 w-3.5" />
          {extra > 0 ? `+${extra}` : "People"}
        </Button>
      </div>
    </div>
  );
}

function StripTile({ user, label, icon, speaking }) {
  return (
    <div className="flex items-center gap-2">
      <UserAvatar user={user} size="sm" speaking={speaking} />
      <div className="hidden min-w-0 sm:block">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="truncate text-xs font-medium">{user.name}</div>
      </div>
    </div>
  );
}
