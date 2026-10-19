import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { BrainCircuit, Send, Sparkles } from "lucide-react";
import { apiStreamPost } from "@/lib/api";
import type { ChatMessage, ChatStreamEvent, PublicUser } from "@/lib/types";
import { LevelBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = ["Seviyeme göre türev konusunu anlat", "Bu soru için bir ipucu ver", "Bana 1 benzer soru üret"];

export default function Coach({ me }: { me: PublicUser }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", content: `Merhaba ${me.name.split(" ")[0]}! Seviyene göre konu anlatabilir, soru çözümünde adım adım ipucu verebilirim. Cevabı hazır vermek yerine düşünmeni sağlayacağım.` }]);
  const chat = useMutation({
    mutationFn: (prompt: string) => apiStreamPost<ChatStreamEvent>("/chat/stream", { message: prompt }, (event) => {
      if (event.type === "delta" && event.content) setMessages((cur) => cur.map((m, i) => (i === cur.length - 1 ? { ...m, content: m.content + event.content } : m)));
    }),
    onError: () => setMessages((cur) => cur.map((m, i) => (i === cur.length - 1 ? { ...m, content: "Şu an bağlantı kurulamadı. Biraz sonra tekrar dener misin?" } : m))),
  });
  const send = (prompt: string) => {
    if (!prompt.trim() || chat.isPending) return;
    setMessages((cur) => [...cur, { id: `u-${Date.now()}`, role: "user", content: prompt }, { id: `a-${Date.now()}`, role: "assistant", content: "" }]);
    setText("");
    chat.mutate(prompt);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };

  return (
    <div className="mx-auto max-w-4xl" data-testid="coach-view">
      <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><BrainCircuit className="size-5" /></div><div><h1 className="font-heading text-lg font-bold text-slate-900" data-testid="coach-title">Sokratik AI koç</h1><div className="text-xs font-semibold text-emerald-600">Seviyene göre anlatım · Gemini</div></div></div>
          <LevelBadge level={me.overall_level} testId="coach-level-badge" />
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6" data-testid="coach-messages">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`coach-message-${m.role}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${m.role === "user" ? "rounded-br-md bg-slate-900 text-white" : "rounded-bl-md bg-slate-100 text-slate-700"}`}>
                {m.role === "assistant" && <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-600"><Sparkles className="size-3" /> AkademiAI</div>}
                {m.content || <span className="inline-flex gap-1" data-testid="coach-thinking"><span className="size-1.5 animate-pulse rounded-full bg-slate-400" /><span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" /><span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" /></span>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="border-t border-slate-100 p-4" data-testid="coach-form">
          <div className="relative"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Konu, soru veya yanlışını yaz..." className="min-h-[72px] resize-none rounded-2xl bg-slate-50 pr-14" data-testid="coach-input" /><Button type="submit" size="icon" disabled={!text.trim() || chat.isPending} className="absolute bottom-3 right-3 size-9 rounded-xl bg-slate-900 text-white" data-testid="coach-send-button"><Send className="size-4" /></Button></div>
          <div className="mt-3 flex flex-wrap gap-2">{SUGGESTIONS.map((s, i) => <button type="button" key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-300 hover:bg-amber-50" data-testid={`coach-suggestion-${i}`}>{s}</button>)}</div>
        </form>
      </section>
    </div>
  );
}
