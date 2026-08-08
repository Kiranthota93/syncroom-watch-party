import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/room";
import { UserAvatar } from "./Avatar";

export function ChatPanel({ participants, currentUserId }) {
  const { messages, send } = useChat();
  const [text, setText] = useState("");
  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-3">
        <ul className="space-y-3">
          {messages.map((m) => {
            const u = byId.get(m.userId);
            const mine = m.userId === currentUserId;
            return (
              <li
                key={m.id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                {u && <UserAvatar user={u} size="xs" />}
                <div className={`max-w-[75%] ${mine ? "items-end" : ""}`}>
                  <div className="mb-0.5 flex items-baseline gap-2 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{u?.name ?? "?"}</span>
                    <span>{m.ts}</span>
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "glass border-glass-border/60"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(currentUserId, text);
          setText("");
        }}
        className="flex items-center gap-2 border-t border-glass-border p-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the room…"
          className="glass h-10 rounded-full border-glass-border px-4"
        />
        <Button
          type="submit"
          size="icon"
          className="glow-primary h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-glow"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
