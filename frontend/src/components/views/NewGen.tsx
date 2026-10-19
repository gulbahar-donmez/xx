import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Lightbulb, Sparkles, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { PracticeAnswerOut, QuestionOut } from "@/lib/types";
import { EmptyState, PageHeader, QuestionFigure, SUBJECTS } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SOURCES = [
  { title: "ÖSYM · YKS çıkmış sorular", text: "2018'den bugüne TYT, AYT ve YDT soru kitapçıkları ve cevap anahtarları.", url: "https://www.osym.gov.tr/tr,15164/yks-cikmis-sorular.html" },
  { title: "MEB OGM Materyal · YKS hazırlık", text: "Ücretsiz soru bankaları, 3 adım denemeler, konu özetleri ve çevrim içi denemeler.", url: "https://ogmmateryal.eba.gov.tr/yks-hazirlik" },
  { title: "MEB ÖDSGM · Örnek soru kitapçıkları", text: "Maarif Modeli'ne uygun bağlam temelli örnek sorular ve çözüm videoları.", url: "https://odsgm.meb.gov.tr/www/ornek-soru-kitapciklari/kategori/151" },
  { title: "MEB ÖDSGM · YKS'ye yönelik yeterlik testleri", text: "Ders bazlı yeterlik testleri ve cevap anahtarları.", url: "https://odsgm.meb.gov.tr/www/yks039ye-yonelik-yeterlik-testleri/icerik/1646" },
];

export default function NewGen() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState<string>("");
  const [results, setResults] = useState<Record<string, PracticeAnswerOut & { answer: number }>>({});
  const list = useQuery({ queryKey: ["new-gen", subject || "all"], queryFn: () => apiGet<QuestionOut[]>(`/questions/new-gen${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`) });
  const answer = useMutation({
    mutationFn: (body: { question_id: string; answer: number }) => apiPost<PracticeAnswerOut>("/practice/answer", body),
    onSuccess: (data, body) => { setResults((cur) => ({ ...cur, [body.question_id]: { ...data, answer: body.answer } })); if (data.points_awarded) toast.success(`+${data.points_awarded} puan`); queryClient.invalidateQueries({ queryKey: meKey }); },
  });
  const [figuresOnly, setFiguresOnly] = useState(false);
  const questions = (list.isError ? [] : list.data ?? []).filter((q) => !figuresOnly || q.figure);
  const solved = Object.values(results);

  return (
    <div className="space-y-6" data-testid="newgen-view">
      <PageHeader testId="newgen-header" eyebrow="Yeni nesil sorular" title="Oku, yorumla, karar ver" description="Tablo, grafik ve günlük hayat senaryolarıyla kurgulanmış bağlam temelli sorular. Öğretmenlerin eklediği sorular kaynağıyla birlikte burada yayınlanır." action={solved.length > 0 && <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700" data-testid="newgen-score">{solved.filter((r) => r.correct).length} / {solved.length} doğru</Badge>} />
      <div className="flex flex-wrap gap-2" data-testid="newgen-subject-tabs">
        <button onClick={() => setFiguresOnly(!figuresOnly)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${figuresOnly ? "border-sky-500 bg-sky-500 text-white" : "border-sky-200 bg-sky-50 text-sky-700"}`} data-testid="newgen-figures-toggle">Şekilli sorular</button>
        {["", ...SUBJECTS].map((s) => <button key={s || "all"} onClick={() => setSubject(s)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${subject === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-amber-300"}`} data-testid={`newgen-subject-${s || "all"}`}>{s || "Tümü"}</button>)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {!questions.length && <EmptyState icon={Sparkles} title={list.isPending ? "Sorular yükleniyor" : "Bu derste yeni nesil soru yok"} text="Başka bir ders seç veya öğretmeninden soru eklemesini iste." testId="newgen-empty" />}
          {questions.map((q, qi) => {
            const r = results[q.id];
            return (
              <Card key={q.id} className="overflow-hidden border-slate-200/80 bg-white shadow-sm" data-testid={`newgen-question-${q.id}`}>
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-bold"><Badge className="border-amber-200 bg-amber-50 text-amber-800">{q.subject}</Badge><span className="text-slate-500">{q.topic}</span><span className="text-slate-400">Zorluk {"●".repeat(q.level)}{"○".repeat(3 - q.level)}</span><span className="ml-auto font-semibold text-slate-400" data-testid={`newgen-source-${q.id}`}>Kaynak: {q.source}</span></div>
                <CardContent className="p-6">
                  <div className="mb-4 whitespace-pre-line rounded-2xl border-l-4 border-sky-400 bg-sky-50/60 p-4 text-sm leading-7 text-slate-700" data-testid={`newgen-context-${q.id}`}>{q.context}</div>
                  <QuestionFigure figure={q.figure} testId={`newgen-figure-${q.id}`} />
                  <h3 className="mb-4 font-heading text-lg font-semibold text-slate-900">{qi + 1}. {q.prompt}</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((o, oi) => {
                      const state = !r ? "idle" : oi === r.correct_index ? "correct" : oi === r.answer ? "wrong" : "idle";
                      return <button key={o} disabled={!!r || answer.isPending} onClick={() => answer.mutate({ question_id: q.id, answer: oi })} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-semibold transition-[border-color,background-color] ${state === "correct" ? "border-emerald-400 bg-emerald-50 text-emerald-800" : state === "wrong" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:border-slate-400"}`} data-testid={`newgen-${q.id}-option-${oi + 1}`}><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold ring-1 ring-slate-200">{state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : String.fromCharCode(65 + oi)}</span>{o}</button>;
                    })}
                  </div>
                  {r && <div className={`mt-4 flex gap-3 rounded-xl p-4 text-sm leading-6 ${r.correct ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`} data-testid={`newgen-feedback-${q.id}`}><Lightbulb className="mt-0.5 size-4 shrink-0" /><div><strong>{r.correct ? "Harika!" : "Çözüm:"}</strong> {r.explanation}</div></div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="h-fit border-slate-200/80 bg-[#fffbf2] xl:sticky xl:top-24" data-testid="newgen-sources">
          <CardContent className="space-y-3 p-5">
            <div className="font-heading text-base font-bold text-slate-900">Resmî ücretsiz kaynaklar</div>
            <p className="text-xs leading-5 text-slate-500">ÖSYM soruları telif koruması altındadır; bu yüzden burada kopyalanmaz, resmî sayfalarından çözebilirsin.</p>
            {SOURCES.map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-white p-3 ring-1 ring-amber-100 transition-shadow hover:shadow-md" data-testid={`newgen-source-link-${i}`}><div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">{s.title}<ExternalLink className="size-3.5 text-slate-400" /></div><div className="mt-0.5 text-xs leading-5 text-slate-500">{s.text}</div></a>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
