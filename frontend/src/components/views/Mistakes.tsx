import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Check, ChevronDown, Lightbulb, NotebookPen, RotateCcw, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { MistakeItem, MistakeNotebook, PracticeAnswerOut, QuestionOut, WeeklyReview } from "@/lib/types";
import { EmptyState, PageHeader, QuestionFigure, SUBJECTS } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const letter = (i: number) => String.fromCharCode(65 + i);

function ReviewQuestion({ q, index, done }: { q: QuestionOut; index: number; done: boolean }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<(PracticeAnswerOut & { answer: number }) | null>(null);
  const answer = useMutation({
    mutationFn: (choice: number) => apiPost<PracticeAnswerOut>("/practice/answer", { question_id: q.id, answer: choice }),
    onSuccess: (data, choice) => {
      setResult({ ...data, answer: choice });
      toast[data.correct ? "success" : "error"](data.correct ? `Öğrenildi olarak işaretlendi${data.points_awarded ? ` · +${data.points_awarded} puan` : ""}` : "Hâlâ yanlış; açıklamayı oku ve sonra tekrar dene");
      ["mistakes", "mistake-review", "dashboard"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
  return (
    <Card className={`border-slate-200/80 bg-white transition-[box-shadow] hover:shadow-md ${done && !result ? "opacity-70" : ""}`} data-testid={`review-question-${index}`}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500"><span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{index}</span><span className="rounded-full bg-slate-100 px-2.5 py-1">{q.subject} · {q.topic}</span>{done && !result && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" data-testid={`review-done-${index}`}>Öğrenildi</Badge>}</div>
        <div className="mb-3 rounded-2xl border-l-4 border-rose-300 bg-rose-50/50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">{q.context}</div>
        <QuestionFigure figure={q.figure} testId={`review-figure-${index}`} />
        <h3 className="mb-4 font-heading text-base font-semibold text-slate-900">{q.prompt}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, oi) => {
            const state = !result ? "idle" : oi === result.correct_index ? "correct" : oi === result.answer ? "wrong" : "idle";
            return (
              <button key={oi} disabled={!!result || answer.isPending} onClick={() => answer.mutate(oi)} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-[border-color,background-color,transform] active:scale-[.99] ${state === "correct" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : state === "wrong" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:border-slate-400"}`} data-testid={`review-q${index}-option-${oi + 1}`}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold ring-1 ring-slate-200">{state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : letter(oi)}</span>{o}
              </button>
            );
          })}
        </div>
        {result && <div className={`mt-4 flex gap-3 rounded-xl p-4 text-sm leading-6 ${result.correct ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`} data-testid={`review-feedback-${index}`}><Lightbulb className="mt-0.5 size-4 shrink-0" /><div><strong>{result.correct ? "Doğru! Defterden düştü." : "Tekrar yanlış."}</strong> {result.explanation}</div></div>}
      </CardContent>
    </Card>
  );
}

function NotebookEntry({ item, index }: { item: MistakeItem; index: number }) {
  const [open, setOpen] = useState(false);
  const q = item.question;
  return (
    <Card className="border-slate-200/80 bg-white" data-testid={`mistake-item-${index}`}>
      <CardContent className="p-0">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50" data-testid={`mistake-toggle-${index}`}>
          <span className={`size-2.5 shrink-0 rounded-full ${item.resolved ? "bg-emerald-500" : "bg-rose-500"}`} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{q.prompt}</div><div className="text-xs text-slate-500">{q.subject} · {q.topic} · {item.wrong_count} kez yanlış · {item.last_wrong_at.slice(0, 10)}</div></div>
          <Badge className={item.resolved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"} data-testid={`mistake-status-${index}`}>{item.resolved ? "Öğrenildi" : "Açık"}</Badge>
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="space-y-3 border-t border-slate-100 p-4" data-testid={`mistake-detail-${index}`}>
            <p className="text-sm leading-7 whitespace-pre-line text-slate-600">{q.context}</p>
            <QuestionFigure figure={q.figure} />
            <div className="grid gap-1.5 sm:grid-cols-2">{q.options.map((o, oi) => <div key={oi} className={`rounded-lg px-3 py-2 text-sm ${oi === item.correct_index ? "bg-emerald-50 font-bold text-emerald-800" : "bg-slate-50 text-slate-600"}`}>{letter(oi)}) {o}</div>)}</div>
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"><Lightbulb className="mt-0.5 size-4 shrink-0" />{item.explanation}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Mistakes() {
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<"open" | "resolved" | "">("open");
  const [testOpen, setTestOpen] = useState(false);
  const notebook = useQuery({ queryKey: ["mistakes"], queryFn: () => apiGet<MistakeNotebook>("/mistakes") });
  const review = useQuery({ queryKey: ["mistake-review"], queryFn: () => apiGet<WeeklyReview>("/mistakes/review") });
  const nb = notebook.isError ? undefined : notebook.data;
  const rv = review.isError ? undefined : review.data;
  const items = (nb?.items ?? []).filter((i) => (!subject || i.question.subject === subject) && (!status || (status === "open" ? !i.resolved : i.resolved)));
  const resolvedInTest = rv?.resolved_ids.length ?? 0;
  const testTotal = rv?.questions.length ?? 0;

  return (
    <div className="space-y-8" data-testid="mistakes-view">
      <PageHeader testId="mistakes-header" eyebrow="Yanlış defteri" title="Yanlışların burada toplanır, haftalık testle kapanır" description="Seviye testinde ve pratikte yanlış yaptığın her soru otomatik olarak deftere düşer. Her hafta en eski açık yanlışlarından 10 soruluk bir tekrar testi hazırlanır; doğru çözdüğün soru “Öğrenildi” olur." />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="relative overflow-hidden border-0 bg-slate-900 text-white shadow-xl" data-testid="review-card">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-rose-500/20 blur-3xl" />
          <CardContent className="relative space-y-5 p-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-300"><CalendarCheck className="size-4" /> Haftalık tekrar testi · {rv?.week ?? "…"}</div>
            {testTotal ? (
              <>
                <div className="font-heading text-3xl font-bold" data-testid="review-progress">{resolvedInTest} / {testTotal} soru kapandı</div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300 transition-[width] duration-700" style={{ width: `${(resolvedInTest / testTotal) * 100}%` }} /></div>
                <p className="text-sm text-slate-300">Bu haftanın testi {rv?.created_at.slice(0, 10)} tarihinde, defterindeki en eski açık yanlışlardan hazırlandı. Toplam açık yanlış: {rv?.total_open}.</p>
                <Button onClick={() => setTestOpen(!testOpen)} className="h-11 rounded-xl bg-rose-400 px-5 font-bold text-slate-950 hover:bg-rose-300" data-testid="review-start-button"><RotateCcw className="size-4" /> {testOpen ? "Testi gizle" : resolvedInTest ? "Teste devam et" : "Teste başla"}</Button>
              </>
            ) : <p className="text-sm leading-6 text-slate-300" data-testid="review-empty">Şu an açık yanlışın yok. Pratik çözdükçe yanlışların buraya düşer ve haftalık test otomatik hazırlanır.</p>}
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-3" data-testid="mistakes-stats">
          {([["Açık", nb?.open, "text-rose-600"], ["Öğrenildi", nb?.resolved, "text-emerald-600"], ["Toplam", nb?.total, "text-slate-900"]] as const).map(([l, v, c]) => <Card key={l} className="border-slate-200/80 bg-white"><CardContent className="p-4"><div className={`font-heading text-3xl font-bold ${c}`} data-testid={`mistakes-stat-${l}`}>{v ?? "—"}</div><div className="text-xs font-semibold text-slate-500">{l}</div></CardContent></Card>)}
          <Card className="col-span-3 border-slate-200/80 bg-white"><CardContent className="flex flex-wrap gap-2 p-4" data-testid="mistakes-by-subject">{nb?.by_subject.map((s) => <span key={s.subject} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{s.subject} · <span className={s.open ? "text-rose-600" : "text-emerald-600"}>{s.open}</span></span>)}</CardContent></Card>
        </div>
      </div>
      {testOpen && rv && <section className="grid gap-4" data-testid="review-questions">{rv.questions.map((q, i) => <ReviewQuestion key={q.id} q={q} index={i + 1} done={rv.resolved_ids.includes(q.id)} />)}</section>}
      <section className="space-y-3" data-testid="notebook-section">
        <div className="flex flex-wrap items-center gap-2"><NotebookPen className="size-5 text-rose-500" /><span className="font-heading text-lg font-bold text-slate-900">Defter · {items.length} soru</span>
          <div className="ml-auto flex flex-wrap gap-1.5" data-testid="notebook-filters">
            {([["open", "Açık"], ["resolved", "Öğrenildi"], ["", "Hepsi"]] as const).map(([v, l]) => <button key={l} onClick={() => setStatus(v)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${status === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400"}`} data-testid={`notebook-status-${v || "all"}`}>{l}</button>)}
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600" data-testid="notebook-subject-filter"><option value="">Tüm dersler</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        </div>
        {!items.length ? <EmptyState icon={NotebookPen} title={notebook.isPending ? "Defter yükleniyor" : "Bu filtrede soru yok"} text="Yanlış yaptığın sorular otomatik olarak burada görünür." testId="notebook-empty" /> : items.map((item, i) => <NotebookEntry key={item.question.id} item={item} index={i + 1} />)}
      </section>
    </div>
  );
}
