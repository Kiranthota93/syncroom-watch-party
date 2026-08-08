import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PreferencesModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-glass-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>
            Tune your SyncRoom experience. Saved locally on this device.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <PrefRow id="ready" label="Show ready notifications" defaultChecked />
          <PrefRow id="motion" label="Reduce motion" />
          <PrefRow id="mic" label="Auto-mute mic on join" defaultChecked />
          <PrefRow id="cam" label="Camera off by default" defaultChecked />
          <PrefRow id="sound" label="Chat sounds" />
          <PrefRow id="reactions" label="Floating reactions" defaultChecked />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrefRow({ id, label, defaultChecked }) {
  return (
    <div className="glass flex items-center justify-between rounded-2xl border-glass-border/60 px-4 py-3">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}
