import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export function UserAvatar({ user, size = "md", ring, speaking, className }) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-full font-semibold text-white shadow-lg",
          sizes[size],
          ring && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          speaking && "animate-ring-pulse",
        )}
        style={{
          background: `linear-gradient(135deg, ${user.color}, oklch(from ${user.color} calc(l - 0.15) c h))`,
        }}
      >
        {user.initials}
      </div>
      {user.online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
      )}
    </div>
  );
}
