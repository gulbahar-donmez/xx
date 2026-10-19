import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Award, Check, CircleHelp, Clock3, Lightbulb, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "@/lib/recharts";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { PlacementResult, PlacementTest } from "@/lib/types";
import { EmptyState, LevelBadge, LevelIcon, errorText } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Placement({ firstTime, onDone }: { firstTime: boolean; onDone: () => void }) {
  const queryClient = useQueryClient();
  const test = useQuery({ queryKey: ["placement-test"], queryFn: () => apiGet<PlacementTest>("/placement/test") });
  const [started, setStarted] = useState(!firstTime);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const submit = useMutation({
    mutationFn: () => apiPost<PlacementResult>("/placement/submit", { answers }),
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); queryClient.invalidateQueries({ queryKey: ["profile"] }); },
  });

  if (result) return <PlacementResultView result={result} firstTime={firstTime} onDone={() => { queryClient.invalidateQueries({ queryKey: meKey }); onDone(); }} />;

  const questions = test.data?.questions ?? [];
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl py-6" data-testid="placement-welcome">
        <div className="relative overflow-hidden rounded-[28px] bg-slate-900 p-8 text-white shadow-xl sm:p-12">
          <div className="absolute -right-16 -top-16 size-64 rounded-full border-[36px] border-amber-400/10" />
          <div className="relative">
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300"><Sparkles className="size-4" /> İlk adım</div>
            <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight" data-testid="placement-welcome-title">Önce seviyeni birlikte keşfedelim.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">5 dersten 15 bağlam temelli soru. Sonuçlarına göre her ders için seviyen belirlenecek; konu anlatımları, öneriler ve pratik soruların bu seviyeye göre hazırlanacak. Test tamamlanmadan diğer bölümler açılmaz.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[{ icon: Target, t: "15 soru", d: "Her dersten 3 zorluk" }, { icon: Clock3, t: "~30 dakika", d: "Acele etmeden çöz" }, { icon: ShieldCheck, t: "Maarif uyumlu", d: "Bağlam temelli sorular" }].map(({ icon: Icon, t, d }) => (
                <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4"><Icon className="mb-2 size-5 text-amber-300" /><div className="text-sm font-bold">{t}</div><div className="text-xs text-slate-400">{d}</div></div>
              ))}
            </div>
            <Button onClick={() => setStarted(true)} disabled={!questions.length} className="mt-8 h-12 rounded-xl bg-amber-500 px-6 font-bold text-slate-950 hover:bg-amber-400" data-testid="placement-start-button">Seviye tespit sınavına başla <ArrowRight className="size-4" /></Button>
          </div>
        </div>
      </div>
    );
  }
  if (!questions.length) return <EmptyState icon={Target} title="Sorular yükleniyor" text="Seviye tespit sınavı hazırlanıyor. Bağlantı sorunu sürerse sayfayı yenile." testId="placement-loading" />;

  const q = questions[current];
  const answered = Object.keys(answers).length;
  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="placement-test">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700"><Target className="size-4" /> Seviye tespit sınavı</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900" data-testid="placement-title">Soru {current + 1} / {questions.length}</h1>
          <p className="mt-2 text-sm text-slate-500" data-testid="placement-progress-text">{answered} cevaplandı · {test.data?.rule}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-[repeat(15,minmax(0,1fr))]" data-testid="placement-question-map">
        {questions.map((item, index) => (
          <button key={item.id} onClick={() => setCurrent(index)} className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${index === current ? "border-slate-900 bg-slate-900 text-white" : answers[item.id] !== undefined ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400 hover:border-amber-300"}`} data-testid={`placement-map-${index + 1}`}>{answers[item.id] !== undefined ? <Check className="size-3.5" /> : index + 1}</button>
        ))}
      </div>
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-lg" data-testid="placement-question-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200" data-testid="placement-subject">{q.subject}</span><span className="text-sm text-slate-400" data-testid="placement-topic">{q.topic}</span></div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400" data-testid="placement-difficulty">Zorluk {"●".repeat(q.level)}{"○".repeat(3 - q.level)}</span>
        </div>
        <CardContent className="p-6 sm:p-10">
          <div className="mb-5 rounded-2xl border-l-4 border-amber-400 bg-amber-50/60 p-4 text-sm leading-7 text-slate-700" data-testid="placement-context">{q.context}</div>
          <h2 className="mb-6 font-heading text-xl font-semibold leading-relaxed text-slate-900" data-testid="placement-prompt">{q.prompt}</h2>
          <div className="grid gap-3" data-testid="placement-options">
            {q.options.map((option, index) => {
              const selected = answers[q.id] === index;
              return (
                <button key={option} onClick={() => setAnswers({ ...answers, [q.id]: index })} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-[transform,border-color,box-shadow] duration-200 ${selected ? "border-amber-500 bg-amber-50 shadow-[0_0_0_3px_rgba(245,158,11,.12)]" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-400"}`} data-testid={`placement-option-${index + 1}`}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selected ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>{String.fromCharCode(65 + index)}</span>
                  <span className="text-sm font-semibold text-slate-700">{option}</span>
                </button>
              );
            })}
          </div>
          {submit.isError && <p className="mt-4 text-sm font-semibold text-red-600" data-testid="placement-error">{errorText(submit.error, "Sonuçlar gönderilemedi, tekrar dene.")}</p>}
          <div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center">
            <button onClick={() => { const next = { ...answers }; delete next[q.id]; setAnswers(next); }} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900" data-testid="placement-blank-button"><CircleHelp className="size-4" /> Boş bırak</button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} className="h-11 rounded-xl" data-testid="placement-prev-button">Geri</Button>
              {current < questions.length - 1
                ? <Button onClick={() => setCurrent(current + 1)} className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800" data-testid="placement-next-button">Sonraki <ArrowRight className="size-4" /></Button>
                : <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="h-11 rounded-xl bg-amber-500 px-5 font-bold text-slate-950 hover:bg-amber-400" data-testid="placement-submit-button">{submit.isPending ? "Değerlendiriliyor..." : "Sınavı bitir"} <Award className="size-4" /></Button>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlacementResultView({ result, firstTime, onDone }: { result: PlacementResult; firstTime: boolean; onDone: () => void }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="placement-result">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card className="border-0 bg-slate-900 text-white shadow-xl" data-testid="placement-result-hero">
          <CardContent className="p-8">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Seviye tespit sonucu</div>
            <div className="flex items-center gap-4"><LevelIcon level={result.overall_level} className="size-14 rounded-2xl [&_svg]:size-7" testId="placement-result-level-icon" /><div><div className="font-heading text-4xl font-bold" data-testid="placement-result-level">{result.level_name}</div><div className="text-sm text-slate-400">Genel başarı %{result.score} · {result.net.toFixed(2)} net</div></div></div>
            <p className="mt-6 text-sm leading-7 text-slate-300" data-testid="placement-result-message">{result.message}</p>
            {result.points_awarded > 0 && <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1.5 text-xs font-bold text-amber-300" data-testid="placement-result-points">+{result.points_awarded} puan kazandın</div>}
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white" data-testid="placement-result-radar">
          <CardContent className="h-[280px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={result.subjects}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="score" stroke="#d97706" fill="#f59e0b" fillOpacity={0.3} /></RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-5" data-testid="placement-result-subjects">
        {result.subjects.map((s) => (
          <Card key={s.subject} className="border-slate-200/80 bg-white" data-testid={`placement-subject-${s.subject}`}>
            <CardContent className="p-4"><div className="mb-3 text-sm font-bold text-slate-800">{s.subject}</div><div className="font-heading text-2xl font-bold text-slate-900">%{s.score}</div><div className="mt-1 text-[11px] text-slate-500">{s.correct}D · {s.wrong}Y · {s.blank}B</div><div className="mt-3"><LevelBadge level={s.level} /></div></CardContent>
          </Card>
        ))}
      </div>
      {result.review.length > 0 && (
        <Card className="border-slate-200/80 bg-white" data-testid="placement-review">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><Lightbulb className="size-5 text-amber-600" /> Kaçırdığın soruların çözüm notları</div>
            {result.review.map((r) => (
              <div key={r.question_id} className="rounded-xl bg-slate-50 p-4 text-sm" data-testid={`placement-review-${r.question_id}`}>
                <div className="mb-1 flex items-center gap-2 font-bold text-slate-800">{r.your_answer < 0 ? <CircleHelp className="size-4 text-slate-400" /> : <X className="size-4 text-red-500" />}{r.subject} · {r.topic} <span className="text-xs font-semibold text-emerald-700">Doğru: {String.fromCharCode(65 + r.correct_index)}</span></div>
                <p className="leading-6 text-slate-600">{r.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Button onClick={onDone} className="h-12 rounded-xl bg-amber-500 px-6 font-bold text-slate-950 hover:bg-amber-400" data-testid="placement-continue-button">{firstTime ? "Kişisel panelime geç" : "Panele dön"} <ArrowRight className="size-4" /></Button>
    </div>
  );
}
