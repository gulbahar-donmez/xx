import { Crown, CircleDashed, Medal, Rocket, Sprout } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export const SUBJECTS = ["Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji"];

const LEVELS: { name: string; icon: ComponentType<{ className?: string }>; tone: string }[] = [
  { name: "Belirlenmedi", icon: CircleDashed, tone: "bg-slate-100 text-slate-500 ring-slate-200" },
  { name: "Başlangıç", icon: Sprout, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { name: "Gelişen", icon: Rocket, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { name: "Yetkin", icon: Medal, tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  { name: "Uzman", icon: Crown, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
];

export function levelName(level: number) {
  return LEVELS[level]?.name ?? LEVELS[0].name;
}

export function LevelIcon({ level, className, testId }: { level: number; className?: string; testId?: string }) {
  const item = LEVELS[level] ?? LEVELS[0];
  const Icon = item.icon;
  return (
    <span title={`Seviye: ${item.name}`} data-testid={testId} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-lg ring-1", item.tone, className)}>
      <Icon className="size-3.5" />
    </span>
  );
}

export function LevelBadge({ level, testId }: { level: number; testId?: string }) {
  const item = LEVELS[level] ?? LEVELS[0];
  const Icon = item.icon;
  return (
    <span data-testid={testId} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1", item.tone)}>
      <Icon className="size-3.5" /> {item.name}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, action, testId }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode; testId: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end" data-testid={testId}>
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-700" data-testid={`${testId}-eyebrow`}>{eyebrow}</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900" data-testid={`${testId}-title`}>{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500" data-testid={`${testId}-description`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, testId, action }: { icon: ComponentType<{ className?: string }>; title: string; text: string; testId: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center" data-testid={testId}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon className="size-5" /></div>
      <div className="font-heading text-base font-bold text-slate-900">{title}</div>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function toneClass(tone: string) {
  return tone === "amber" ? "bg-amber-50 text-amber-700 border-amber-200" : tone === "green" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tone === "blue" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-slate-100 text-slate-700 border-slate-200";
}

export function errorText(error: unknown, fallback: string) {
  const body = (error as { body?: { detail?: unknown } } | null)?.body;
  return typeof body?.detail === "string" ? body.detail : fallback;
}

export const fieldClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-[border-color,box-shadow] focus:border-amber-400 focus:ring-3 focus:ring-amber-100";
