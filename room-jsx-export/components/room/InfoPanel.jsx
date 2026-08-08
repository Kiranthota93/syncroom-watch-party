import { Clock, Timer, KeyRound, Users2, Film } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export function InfoPanel({ participants, roomCode }) {
  return (
    <ScrollArea className="flex-1 px-5 py-4">
      <section className="space-y-3">
        <SectionTitle>Session</SectionTitle>
        <div className="glass grid grid-cols-2 gap-3 rounded-2xl border-glass-border/60 p-4 text-sm">
          <Field icon={Clock} label="Duration" value="01m 39s" />
          <Field icon={Timer} label="Expires in" value="23h 58m" />
          <Field icon={KeyRound} label="Room code" value={roomCode} mono />
          <Field icon={Users2} label="Members" value={`${participants.length} / 15`} />
        </div>
      </section>

      <section className="mt-5 space-y-3">
        <SectionTitle>Content</SectionTitle>
        <div className="glass flex items-center gap-3 rounded-2xl border-glass-border/60 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/20 text-primary">
            <Film className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">No content selected</div>
            <div className="text-[11px] text-muted-foreground">Pick a source below the stage</div>
          </div>
        </div>
      </section>

      <section className="mt-5 space-y-3 pb-6">
        <SectionTitle>Room settings</SectionTitle>
        <SettingRow label="Chat" defaultChecked />
        <SettingRow label="Reactions" defaultChecked />
        <SettingRow label="Require ready" />
        <SettingRow label="Control requests" defaultChecked />
        <SettingRow label="Local video" defaultChecked />
        <SettingRow label="YouTube" defaultChecked />
      </section>
    </ScrollArea>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function Field({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function SettingRow({ label, defaultChecked }) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl border-glass-border/60 px-4 py-3 text-sm">
      <span>{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
