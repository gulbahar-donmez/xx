import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpenCheck, Lightbulb, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { PublicUser, TopicCard } from "@/lib/types";
import { LevelBadge, PageHeader, SUBJECTS } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";

export function TopicCards({ subject, level, compact = false }: { subject: string; level?: number; compact?: boolean }) {
  const cards = useQuery({ queryKey: ["topics", subject, level ?? "all"], queryFn: () => apiGet<TopicCard[]>(`/topics?subject=${encodeURIComponent(subject)}${level ? `&level=${level}` : ""}`) });
  const list = cards.isError ? [] : cards.data ?? [];
  if (!list.length) return null;
  return (
    <div className={compact ? "space-y-3" : "grid gap-4 lg:grid-cols-3"} data-testid={`topic-cards-${subject}`}>
      {compact && <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-700"><BookOpenCheck className="size-4" /> Önce kısa özet</div>}
      {list.map((c) => (
        <Card key={c.id} className="border-sky-100 bg-gradient-to-br from-sky-50/80 to-white" data-testid={`topic-card-${c.id}`}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3"><h3 className="font-heading text-base font-bold text-slate-900" data-testid={`topic-card-title-${c.id}`}>{c.title}</h3><LevelBadge level={c.level} /></div>
            <p className="text-sm leading-6 text-slate-600">{c.summary}</p>
            <ul className="space-y-1.5">{c.points.map((p) => <li key={p} className="flex gap-2 text-sm text-slate-700"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-500" />{p}</li>)}</ul>
            <div className="rounded-xl bg-white px-3 py-2 font-mono text-[13px] text-slate-800 ring-1 ring-sky-100">{c.example}</div>
            <div className="flex gap-2 text-xs leading-5 text-amber-800"><Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />{c.tip}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Topics({ me }: { me: PublicUser }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [mine, setMine] = useState(true);
  const level = me.subject_levels[subject];
  return (
    <div className="space-y-6" data-testid="topics-view">
      <PageHeader testId="topics-header" eyebrow="Konu anlatım kartları" title="Kısa, net, seviyene göre" description="Her ders ve seviye için temel kural, örnek ve sınav ipucu. Pratiğe başlamadan önce 2 dakikalık özet." />
      <div className="flex flex-wrap items-center gap-2" data-testid="topics-subject-tabs">
        {SUBJECTS.map((s) => <button key={s} onClick={() => setSubject(s)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${subject === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"}`} data-testid={`topics-subject-${s}`}>{s}</button>)}
        {me.role === "student" && level !== undefined && (
          <button onClick={() => setMine(!mine)} className="ml-auto flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-800" data-testid="topics-level-toggle"><Sparkles className="size-3.5" /> {mine ? "Yalnızca seviyem" : "Tüm seviyeler"}</button>
        )}
      </div>
      <TopicCards subject={subject} level={me.role === "student" && mine ? level : undefined} />
    </div>
  );
}
