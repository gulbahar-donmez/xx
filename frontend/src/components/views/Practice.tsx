import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Lightbulb, RotateCcw, Target, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { PracticeAnswerOut, PracticeSet } from "@/lib/types";
import { EmptyState, LevelBadge, PageHeader, SUBJECTS } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Practice({ initialSubject }: { initialSubject?: string }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const [results, setResults] = useState<Record<string, PracticeAnswerOut & { answer: number }>>({});
  const practice = useQuery({ queryKey: ["practice", subject ?? "auto"], queryFn: () => apiGet<PracticeSet>(`/practice${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`) });
  const answer = useMutation({
    mutationFn: (body: { question_id: string; answer: number }) => apiPost<PracticeAnswerOut>("/practice/answer", body),
    onSuccess: (data, body) => {
      setResults((current) => ({ ...current, [body.question_id]: { ...data, answer: body.answer } }));
      if (data.points_awarded) toast.success(`+${data.points_awarded} puan`);
      queryClient.invalidateQueries({ queryKey: meKey });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  const set = practice.isError ? undefined : practice.data;
  const solved = Object.keys(results).length;
  const correct = Object.values(results).filter((r) => r.correct).length;

  return (
    <div className="space-y-6" data-testid="practice-view">
      <PageHeader testId="practice-header" eyebrow="Seviye bazlı pratik" title={set ? `${set.subject} · ${set.level_name} seviyesi` : "Sana uygun sorular"} description="Sorular seviye tespit sonucuna göre seçilir. İlk kez doğru çözdüğün her soru 10 puan kazandırır." action={set && <LevelBadge level={set.level} testId="practice-level-badge" />} />
      <div className="flex flex-wrap gap-2" data-testid="practice-subject-tabs">
        {SUBJECTS.map((s) => (
          <button key={s} onClick={() => { setSubject(s); setResults({}); }} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${set?.subject === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"}`} data-testid={`practice-subject-${s}`}>{s}</button>
        ))}
        {solved > 0 && <span className="ml-auto self-center text-sm font-bold text-slate-600" data-testid="practice-score">{correct} / {solved} doğru</span>}
      </div>
      {!set && <EmptyState icon={Target} title={practice.isPending ? "Sorular hazırlanıyor" : "Sorular yüklenemedi"} text="Bağlantı kurulduğunda seviyene uygun sorular burada görünecek." testId="practice-empty" />}
      <div className="grid gap-5">
        {set?.questions.map((q, qi) => {
          const r = results[q.id];
          return (
            <Card key={q.id} className="border-slate-200/80 bg-white shadow-sm" data-testid={`practice-question-${qi + 1}`}>
              <CardContent className="p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">{q.topic}</span><span>Zorluk {"●".repeat(q.level)}{"○".repeat(3 - q.level)}</span></div>
                <div className="mb-4 rounded-2xl border-l-4 border-amber-400 bg-amber-50/60 p-4 text-sm leading-7 text-slate-700">{q.context}</div>
                <h3 className="mb-5 font-heading text-lg font-semibold text-slate-900" data-testid={`practice-prompt-${qi + 1}`}>{q.prompt}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((option, oi) => {
                    const state = !r ? "idle" : oi === r.correct_index ? "correct" : oi === r.answer ? "wrong" : "idle";
                    return (
                      <button key={option} disabled={!!r || answer.isPending} onClick={() => answer.mutate({ question_id: q.id, answer: oi })} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-[border-color,background-color] ${state === "correct" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : state === "wrong" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:border-slate-400 disabled:hover:border-slate-200"}`} data-testid={`practice-q${qi + 1}-option-${oi + 1}`}>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold ring-1 ring-slate-200">{state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : String.fromCharCode(65 + oi)}</span>{option}
                      </button>
                    );
                  })}
                </div>
                {r && (
                  <div className={`mt-4 flex gap-3 rounded-xl p-4 text-sm leading-6 ${r.correct ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`} data-testid={`practice-feedback-${qi + 1}`}>
                    <Lightbulb className="mt-0.5 size-4 shrink-0" /><div><strong>{r.correct ? "Doğru!" : "Bir dahaki sefere."}</strong> {r.explanation}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {solved > 0 && <Button variant="outline" onClick={() => setResults({})} className="rounded-xl" data-testid="practice-reset-button"><RotateCcw className="size-4" /> Yeniden çöz</Button>}
    </div>
  );
}
