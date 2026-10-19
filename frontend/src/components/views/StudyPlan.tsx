import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, Zap } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { AssignmentCompleteOut, Recommendation, StudentAssignment } from "@/lib/types";
import type { View } from "@/pages/Home";
import { EmptyState, LevelIcon, PageHeader, toneClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StudyPlan({ onView }: { onView: (view: View, subject?: string) => void }) {
  const queryClient = useQueryClient();
  const assignments = useQuery({ queryKey: ["my-assignments"], queryFn: () => apiGet<StudentAssignment[]>("/assignments/mine") });
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: () => apiGet<Recommendation[]>("/recommendations") });
  const complete = useMutation({
    mutationFn: (id: string) => apiPost<AssignmentCompleteOut>(`/assignments/${id}/complete`),
    onSuccess: (data) => {
      toast.success(data.points_awarded ? `Ödev tamamlandı · +${data.points_awarded} puan` : "Ödev zaten tamamlanmıştı");
      ["my-assignments", "dashboard", "profile"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
  const list = assignments.isError ? [] : assignments.data ?? [];
  const pending = list.filter((a) => !a.completed);

  return (
    <div className="space-y-8" data-testid="plan-view">
      <PageHeader testId="plan-header" eyebrow="Çalışma planım" title="Ödevlerin ve kişisel müfredatın" description="Öğretmeninin atadığı ödevler ve seviyene göre hazırlanan öneriler tek listede." action={<Badge className="w-fit border-amber-200 bg-amber-50 text-amber-700" data-testid="plan-pending-badge">{pending.length} bekleyen ödev</Badge>} />
      <section className="space-y-3" data-testid="plan-assignments">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><ClipboardList className="size-5 text-amber-600" /> Öğretmen ödevleri</h2>
        {list.length === 0 && <EmptyState icon={ClipboardList} title="Atanmış ödev yok" text="Öğretmenin sana veya sınıfına ödev atadığında burada görünecek." testId="plan-assignments-empty" />}
        {list.map((a) => (
          <Card key={a.id} className={`border-slate-200/80 bg-white ${a.completed ? "opacity-70" : ""}`} data-testid={`assignment-${a.id}`}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${a.completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-amber-300"}`}>{a.completed ? <CheckCircle2 className="size-5" /> : <ClipboardList className="size-5" />}</div>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-base font-bold text-slate-900" data-testid={`assignment-title-${a.id}`}>{a.title}</div>
                <div className="mt-1 text-sm text-slate-500">{a.subject} · {a.topic} · {a.question_count} soru · {a.teacher_name}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500" data-testid={`assignment-due-${a.id}`}><CalendarClock className="size-4" /> {new Date(a.due_date).toLocaleDateString("tr-TR")}</span>
                {a.completed ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" data-testid={`assignment-done-${a.id}`}>Tamamlandı</Badge> : <Button onClick={() => complete.mutate(a.id)} disabled={complete.isPending} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800" data-testid={`assignment-complete-${a.id}`}>Tamamladım</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3" data-testid="plan-recommendations">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><Zap className="size-5 text-amber-600" /> Seviyene göre önerilen çalışmalar</h2>
        {(recs.isError ? [] : recs.data ?? []).map((r, i) => (
          <Card key={r.id} className="border-slate-200/80 bg-white" data-testid={`plan-rec-${r.id}`}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 font-heading text-lg font-bold text-amber-800">{String(i + 1).padStart(2, "0")}</div>
              <div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><Badge className={toneClass(r.tone)}>{r.tag}</Badge><LevelIcon level={r.level} /></div><div className="font-heading text-base font-bold text-slate-900">{r.title}</div><div className="text-sm text-slate-500">{r.detail} · {r.duration}</div></div>
              <Button onClick={() => onView("practice", r.subject)} variant="outline" className="rounded-xl" data-testid={`plan-rec-start-${r.id}`}>Pratiğe başla <ArrowRight className="size-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
