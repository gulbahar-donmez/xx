import type { AdminOverview, AssessmentResult, ClassroomOverview, DashboardData, Question } from "@/lib/types";

export const dashboardFallback: DashboardData = {
  greeting: "Bugün hedefinle aranda sadece birkaç doğru var.",
  streak: 6,
  weekly_goal: 12,
  weekly_progress: 8,
  metrics: [
    { label: "TYT tahmini puan", value: "418,5", change: "+12,4", tone: "amber" },
    { label: "Toplam net", value: "78,25", change: "+4,75", tone: "green" },
    { label: "Kazanım oranı", value: "%76", change: "+8%", tone: "blue" },
    { label: "Çalışma serisi", value: "6 gün", change: "En iyi: 11", tone: "slate" },
  ],
  subject_scores: [
    { subject: "Matematik", score: 72, correct: 18, wrong: 5, blank: 2, target: 85 },
    { subject: "Türkçe", score: 84, correct: 22, wrong: 3, blank: 0, target: 90 },
    { subject: "Fizik", score: 61, correct: 12, wrong: 5, blank: 3, target: 80 },
    { subject: "Kimya", score: 76, correct: 15, wrong: 3, blank: 2, target: 84 },
    { subject: "Biyoloji", score: 88, correct: 18, wrong: 2, blank: 0, target: 92 },
  ],
  trend: [
    { name: "12 Şub", net: 64 }, { name: "19 Şub", net: 67 }, { name: "26 Şub", net: 65 },
    { name: "04 Mar", net: 71 }, { name: "11 Mar", net: 73 }, { name: "18 Mar", net: 78 },
  ],
  recommendations: [
    { id: "rec-math", tag: "Öncelikli eksik", subject: "Matematik", title: "Fonksiyonlarda öteleme & bileşke", detail: "15 dk mikro anlatım + 8 seviye 2 pekiştirme sorusu", gain: "+2,25 net", duration: "35 dk", tone: "amber" },
    { id: "rec-turkish", tag: "Sınav stratejisi", subject: "Türkçe", title: "Paragrafta hız ve süre yönetimi", detail: "Süre kısıtlı 20 soruluk tempo testi", gain: "+3,00 net", duration: "28 dk", tone: "blue" },
    { id: "rec-physics", tag: "Kazanımı koru", subject: "Fizik", title: "Vektörler & bağıl hareket", detail: "Haftalık 5 soruluk hızlı tarama", gain: "Koruma", duration: "12 dk", tone: "green" },
  ],
  next_session: { title: "Matematik mini kampı", subtitle: "Fonksiyonlar · Seviye 2", time: "Bugün · 19:30", progress: "2 / 8 görev" },
};

export const questionFallback: { questions: Question[]; total: number; rule: string } = {
  total: 5,
  rule: "4 yanlış 1 doğruyu götürür",
  questions: [
    { id: "math-functions", subject: "Matematik", topic: "Fonksiyonlar", difficulty: "Orta", prompt: "f(x) = 2x + 3 ve g(x) = x - 1 olduğuna göre (f ∘ g)(4) kaçtır?", options: ["7", "9", "11", "13"], correct_index: 1 },
    { id: "turkish-paragraph", subject: "Türkçe", topic: "Paragraf", difficulty: "Başlangıç", prompt: "Bir düşüncenin örneklerle desteklenerek daha anlaşılır hâle getirilmesine ne ad verilir?", options: ["Tanımlama", "Örnekleme", "Benzetme", "Karşılaştırma"], correct_index: 1 },
    { id: "physics-optics", subject: "Fizik", topic: "Optik", difficulty: "Orta", prompt: "Düzlem aynada görüntünün aynaya olan uzaklığı için hangisi doğrudur?", options: ["Cisimden azdır", "Cisimle aynıdır", "Her zaman sıfırdır", "Işık hızına bağlıdır"], correct_index: 1 },
    { id: "chemistry-moles", subject: "Kimya", topic: "Mol Kavramı", difficulty: "İleri", prompt: "1 mol ideal gazın standart koşullardaki hacmi yaklaşık kaç litredir?", options: ["11,2", "18", "22,4", "44,8"], correct_index: 2 },
    { id: "biology-cell", subject: "Biyoloji", topic: "Hücre", difficulty: "Başlangıç", prompt: "Protein sentezinde aminoasitleri ribozoma taşıyan RNA çeşidi hangisidir?", options: ["mRNA", "tRNA", "rRNA", "miRNA"], correct_index: 1 },
  ],
};

export const classroomFallback: ClassroomOverview = {
  active_students: 128,
  average_net: 68.4,
  pending_reviews: 14,
  live_room: { title: "Deneme 04 · Yanlışlar kliniği", teacher: "Zeynep Öğretmen", status: "Bugün 20:00 · 18 öğrenci" },
  common_mistakes: [{ topic: "Problemler", count: "42 hata", note: "İşlem önceliği" }, { topic: "Paragraf", count: "37 hata", note: "Ana düşünce" }, { topic: "Optik", count: "29 hata", note: "Ayna görüntüsü" }],
  students: [{ name: "Elif Yılmaz", class: "12-A", net: "78,25", status: "İnceleme bekliyor" }, { name: "Mert Kaya", class: "12-A", net: "64,50", status: "Ödev atandı" }, { name: "Duru Şen", class: "12-B", net: "83,75", status: "İyi gidiyor" }],
};

export const adminFallback: AdminOverview = {
  active_users: 684,
  weekly_completion: "%72",
  question_bank: 12480,
  role_breakdown: [{ role: "Öğrenci", value: "612", percent: "%89" }, { role: "Öğretmen", value: "48", percent: "%7" }, { role: "Yönetici", value: "24", percent: "%4" }],
  system_notes: ["Son 7 günde 2.148 deneme analizi tamamlandı.", "TYT Matematik soru havuzunda 38 yeni kazanım etiketi bekliyor.", "Canlı classroom oturumlarında ortalama katılım %86."],
};

export const emptyAssessmentResult: AssessmentResult = {
  id: "local-result",
  score: 0,
  net: 0,
  percentile: "%48",
  strengths: [],
  gaps: [],
  subjects: [],
  message: "Yanıtların değerlendiriliyor.",
  completed_at: new Date().toISOString(),
};