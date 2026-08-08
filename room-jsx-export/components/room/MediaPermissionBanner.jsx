import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MediaPermissionBanner({ needMic, needCam, onGrantMic, onGrantCam }) {
  if (!needMic && !needCam) return null;
  return (
    <div className="glass mx-4 mt-3 flex items-center gap-3 rounded-2xl border-glass-border/60 px-4 py-2.5">
      <Shield className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        SyncRoom needs {needMic && "mic"}
        {needMic && needCam && " and "}
        {needCam && "camera"} access to enable voice and video.
      </p>
      {needMic && (
        <Button size="sm" variant="secondary" className="h-8 rounded-full" onClick={onGrantMic}>
          Allow mic
        </Button>
      )}
      {needCam && (
        <Button size="sm" variant="secondary" className="h-8 rounded-full" onClick={onGrantCam}>
          Allow camera
        </Button>
      )}
    </div>
  );
}
