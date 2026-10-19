import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Lightbulb, Save, Upload } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/lib/recharts";
import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { ExamDistribution, ExamParse, ExamResult, ExamRow, ExamType } from "@/lib/types";
import { EmptyState, LevelBadge, PageHeader, errorText, fieldClass } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const blankRows = (d?: ExamDistribution): ExamRow[] => (d?.items ?? []).map((i) => ({ subject: i.subject, correct: 0, wrong: 0, blank: i.questions, net: 0, max_questions: i.questions, rate: 0, level: 0, advice: "" }));

export default function ExamUpload() {
  const queryClient = useQueryClient();
  const dists = useQuery({ queryKey: ["exam-distributions"], queryFn: () => apiGet<ExamDistribution[]>("/exams/distributions") });
  const exams = useQuery({ queryKey: ["exams"], queryFn: () => apiGet<ExamResult[]>("/exams") });
  const [examType, setExamType] = useState<ExamType>("TYT");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<ExamRow[] | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);
  const dist = dists.data?.find((d) => d.exam_type === examType);
  const editing = rows ?? blankRows(dist);

  const parse = useMutation({
    mutationFn: (file: File) => { const form = new FormData(); form.append("file", file); form.append("exam_type", examType); return apiUpload<ExamParse>("/exams/parse", form); },
    onSuccess: (data, file) => { setRows(data.rows); setNote(data.message); if (!name) setName(file.name.replace(/\.[^.]+$/, "")); data.parsed ? toast.success("Dosya okundu") : toast.message("Tablo okunamadı, elle düzenleyebilirsin"); },
    onError: (error) => toast.error(errorText(error, "Dosya yüklenemedi")),
  });
  const save = useMutation({
    mutationFn: () => apiPost<ExamResult>("/exams", { name: name || `${examType} denemesi`, exam_type: examType, rows: editing }),
    onSuccess: (data) => { setResult(data); setRows(null); setNote(""); ["exams", "dashboard", "recommendations", "profile"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); queryClient.invalidateQueries({ queryKey: meKey }); toast.success("Deneme analiz edildi · +15 puan"); },
    onError: (error) => toast.error(errorText(error, "Kaydedilemedi")),
  });
  const update = (i: number, key: "correct" | "wrong", value: string) => {
    const next = editing.map((r, idx) => (idx === i ? { ...r, [key]: Math.max(0, Number(value) || 0) } : r));
    setRows(next.map((r) => ({ ...r, blank: r.max_questions ? Math.max(0, r.max_questions - r.correct - r.wrong) : r.blank, net: r.correct - r.wrong / 4 })));
  };
  const shown = result ?? (exams.isError ? undefined : exams.data?.[0]);

  return (
    <div className="space-y-8" data-testid="exams-view">
      <PageHeader testId="exams-header" eyebrow="Deneme analizi" title="Deneme sonucunu yükle, YKS dağılımına göre analiz edelim" description="Excel (.xlsx), CSV veya PDF yükle. Her ders, ÖSYM soru sayısına göre (ör. TYT Türkçe 40, Fen 20) değerlendirilir; 4 yanlış 1 doğruyu götürür." />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="border-slate-200/80 bg-white" data-testid="exam-editor">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap gap-2" data-testid="exam-type-tabs">
              {(dists.data ?? []).map((d) => (
                <button key={d.exam_type} onClick={() => { setExamType(d.exam_type); setRows(null); setNote(""); }} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${examType === d.exam_type ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-amber-300"}`} data-testid={`exam-type-${d.exam_type}`}>{d.label} · {d.total_questions} soru</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Deneme adı (ör. Özdebir TYT-3)" className={fieldClass} data-testid="exam-name-input" />
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400" data-testid="exam-upload-label">
                <Upload className="size-4" /> {parse.isPending ? "Okunuyor..." : "Dosya yükle"}
                <input type="file" accept=".xlsx,.xlsm,.csv,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parse.mutate(f); e.target.value = ""; }} data-testid="exam-file-input" />
              </label>
            </div>
            {note && <div className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800" data-testid="exam-parse-message">{note}</div>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm" data-testid="exam-rows-table">
                <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="pb-2">Ders</th><th className="pb-2">Soru</th><th className="pb-2">Doğru</th><th className="pb-2">Yanlış</th><th className="pb-2">Boş</th><th className="pb-2">Net</th></tr></thead>
                <tbody>
                  {editing.map((r, i) => (
                    <tr key={r.subject} className="border-t border-slate-100" data-testid={`exam-row-${i}`}>
                      <td className="py-2 font-bold text-slate-800">{r.subject}</td>
                      <td className="py-2 text-slate-500" data-testid={`exam-row-max-${i}`}>{r.max_questions || "—"}</td>
                      <td className="py-2 pr-2"><input type="number" min={0} max={r.max_questions || 200} value={r.correct} onChange={(e) => update(i, "correct", e.target.value)} className={`${fieldClass} h-9 w-20`} data-testid={`exam-row-correct-${i}`} /></td>
                      <td className="py-2 pr-2"><input type="number" min={0} max={r.max_questions || 200} value={r.wrong} onChange={(e) => update(i, "wrong", e.target.value)} className={`${fieldClass} h-9 w-20`} data-testid={`exam-row-wrong-${i}`} /></td>
                      <td className="py-2 text-slate-500" data-testid={`exam-row-blank-${i}`}>{r.blank}</td>
                      <td className="py-2 font-bold text-slate-900" data-testid={`exam-row-net-${i}`}>{(r.correct - r.wrong / 4).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-sm font-bold text-slate-700" data-testid="exam-total-net">Toplam net: {editing.reduce((s, r) => s + r.correct - r.wrong / 4, 0).toFixed(2)} / {dist?.total_questions ?? "—"}</span>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !editing.length} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800" data-testid="exam-save-button"><Save className="size-4" /> Analiz et ve kaydet</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-[#fffbf2]" data-testid="exam-distribution-card">
          <CardContent className="p-6">
            <div className="mb-4 font-heading text-base font-bold text-slate-900">{dist?.label ?? "YKS soru dağılımı"} · {dist?.duration_minutes ?? "—"} dk</div>
            <div className="space-y-2">
              {(dist?.items ?? []).map((i) => (
                <div key={i.subject} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-amber-100" data-testid={`distribution-${i.subject}`}><span className="font-semibold text-slate-700">{i.subject}<span className="ml-2 text-[11px] text-slate-400">{i.group}</span></span><span className="font-bold text-slate-900">{i.questions}</span></div>
              ))}
            </div>
            <div className="mt-5 flex gap-3 text-xs text-slate-500"><FileSpreadsheet className="size-4 shrink-0 text-emerald-600" /> Excel'de "Ders · Doğru · Yanlış · Boş" başlıklı bir tablo otomatik okunur.</div>
            <div className="mt-2 flex gap-3 text-xs text-slate-500"><FileText className="size-4 shrink-0 text-red-500" /> PDF'de metin katmanı olan karne tabloları okunur; taranmış PDF'lerde değerleri elle gir.</div>
          </CardContent>
        </Card>
      </div>

      {shown ? (
        <section className="space-y-5" data-testid="exam-result">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 bg-slate-900 text-white"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{shown.exam_type} · {shown.name}</div><div className="mt-3 font-heading text-4xl font-bold" data-testid="exam-result-net">{shown.total_net.toFixed(2)} net</div><div className="text-sm text-slate-400">{shown.total_questions} soru üzerinden</div></CardContent></Card>
            <Card className="border-slate-200/80 bg-white"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Tahmini ham puan</div><div className="mt-3 font-heading text-4xl font-bold text-slate-900" data-testid="exam-result-score">{shown.estimated_score}</div><div className="text-sm text-slate-500">Yaklaşık hesap, ÖSYM katsayıları değişebilir</div></CardContent></Card>
            <Card className="border-slate-200/80 bg-white"><CardContent className="p-6"><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Öncelik</div><div className="mt-3 font-heading text-2xl font-bold text-slate-900" data-testid="exam-result-weakest">{shown.weakest}</div><div className="text-sm text-emerald-700">Güçlü ders: {shown.strongest}</div></CardContent></Card>
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="border-slate-200/80 bg-white" data-testid="exam-result-chart"><CardContent className="h-[300px] p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={shown.rows}><CartesianGrid vertical={false} stroke="#e2e8f0" /><XAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} /><YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} /><Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} /><Bar dataKey="max_questions" name="Soru" fill="#e2e8f0" radius={[6, 6, 0, 0]} /><Bar dataKey="net" name="Net" fill="#d97706" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
            <Card className="border-slate-200/80 bg-white" data-testid="exam-result-rows"><CardContent className="space-y-2 p-5">
              {shown.rows.map((r) => (
                <div key={r.subject} className="rounded-xl bg-slate-50 p-3" data-testid={`exam-result-row-${r.subject}`}>
                  <div className="flex items-center justify-between text-sm"><span className="font-bold text-slate-800">{r.subject} · {r.net} / {r.max_questions || "—"}</span><span className="flex items-center gap-2 font-bold">%{r.rate}<LevelBadge level={r.level} /></span></div>
                  {r.advice && <p className="mt-1 text-xs leading-5 text-slate-500">{r.advice}</p>}
                </div>
              ))}
            </CardContent></Card>
          </div>
          <Card className="border-amber-200 bg-amber-50/60" data-testid="exam-result-advice"><CardContent className="space-y-2 p-6">{shown.advice.map((a) => <div key={a} className="flex gap-3 text-sm leading-6 text-slate-700"><Lightbulb className="mt-1 size-4 shrink-0 text-amber-600" />{a}</div>)}</CardContent></Card>
        </section>
      ) : <EmptyState icon={FileSpreadsheet} title="Henüz analiz edilmiş deneme yok" text="İlk denemeni yükle veya değerleri elle gir; YKS dağılımına göre karne oluşsun." testId="exam-empty" />}
    </div>
  );
}
