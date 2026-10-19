# AkademiAI — Living Spec

## Purpose
Türkçe YKS hazırlık platformu. Öğrenci kayıt olunca **zorunlu seviye tespit sınavı** çözer; ders bazlı seviyesi (Başlangıç/Gelişen/Yetkin/Uzman, ikonlu) belirlenir. Sonra seviyesine göre öneriler, pratik soruları, YKS dağılımına göre deneme analizi, öğretmen ödevleri, canlı sınıf, soru paylaşım ortamı, pomodoro ile puan ve profil.

## Stack (zorunlu: Python + JavaScript)
- Backend: Python 3.11 · FastAPI · Pydantic v2 · MongoDB (motor). Tüm route'lar `/api` altında (`backend/routers/*`).
- Frontend: React 19 + TypeScript (JavaScript ekosistemi) · Vite · Tailwind v4 · shadcn/ui · TanStack Query · Recharts.
- Not: Proje dokümanı PostgreSQL diyor; şablon MongoDB ile çalışıyor (spec deviation).

## Auth & roller
- E-posta/şifre, bcrypt hash, httpOnly `akademi_session` JWT cookie (7 gün, `JWT_SECRET` .env).
- `/api/auth/register` (yalnızca öğrenci kaydı), `/login`, `/logout`, `/me`.
- Roller: `student`, `teacher`, `admin`. `require_roles` ile backend'de zorlanır (öğrenci → admin 403).
- Demo hesaplar: `memory/test_credentials.md`.

## Key flows
1. **Seviye testi** (`/api/placement/test|submit|latest`): 15 bağlam temelli soru (5 ders × 3 zorluk). Puanlama: zorluk ağırlıklı (1/2/3), 4 yanlış 1 doğru. Ders skoru % → seviye: <40 Başlangıç, 40-69 Gelişen, 70-89 Yetkin, ≥90 Uzman. İlk tamamlamada +100 puan. Test bitmeden öğrenci menüsü kilitli.
2. **Soru bankası** `backend/lib/question_bank.py`: 30 özgün soru, Türkiye Yüzyılı Maarif Modeli bağlam temelli soru yazım kılavuzuna (MEB, Mart 2026) uygun yazıldı. `correct_index` istemciye gönderilmez.
3. **Pratik** (`/api/practice?subject=`, `/practice/answer`): öğrencinin ders seviyesi ve bir üstü bandından sorular; ilk doğru çözüm +10 puan, açıklama döner.
4. **Öneriler** (`/api/recommendations`, dashboard): en zayıf 2 ders + en güçlü ders (koruma), seviyeye göre plan metni; son denemeden YKS ağırlıklı en büyük net potansiyelli ders öne eklenir.
5. **Deneme analizi** (`/api/exams/distributions|parse|`): TYT (Türkçe 40, Tarih/Coğrafya/Felsefe/Din 5'er, Matematik 40, Fizik 7, Kimya 7, Biyoloji 6 = 120), AYT-SAY (Mat 40, Fiz 14, Kim 13, Bio 13), AYT-EA (Mat 40, Edebiyat 24, Tarih-1 10, Coğ-1 6), AYT-SÖZ. Excel/CSV otomatik okunur, PDF metin katmanından okunur, okunamazsa dağılıma göre boş form. Doğru+yanlış > soru sayısı → 422. Ders başına net, %başarı, seviye, seviye tavsiyesi; tahmini ham puan (yaklaşık). +15 puan.
6. **Ödevler** (`/api/assignments`, `/assignments/mine`, `/assignments/{id}/complete`): öğretmen tek/çoklu öğrenci veya tüm sınıfa; öğrenci tamamlar (+50).
7. **Canlı sınıf** (`/api/classrooms`, `/join`, `/{id}`, `/{id}/messages`, `/{id}/end`): 6 haneli kod, katılımcı listesi, mesaj/soru akışı (3 sn polling), Jitsi Meet video (`JITSI_DOMAIN`, varsayılan meet.jit.si; yeni sekmede veya sayfada iframe). Katılmayan kullanıcı odayı göremez (403).
8. **Soru paylaşımı** (`/api/social/posts`, `/answers`) + `/api/leaderboard`: soru +5, başkasına yanıt +15; herkesin yanında seviye ikonu.
9. **Pomodoro** (`/api/pomodoro/complete`): 25/50/1 dk preset, tamamlanınca +25 ve 5 dk mola.
10. **Profil** (`/api/profile` GET/PATCH): seviye ikonu, puan, sıralama, istatistikler, rozetler.
11. **AI koç** (`/api/chat/stream`, SSE): `GEMINI_API_KEY` varsa Gemini `gemini-3-flash-preview` (öğrencinin seviyeleri sistem mesajında), yoksa **MOCK** yanıtlar.
12. **Admin** (`/api/admin/overview`): sayaçlar + kullanıcı/rol listesi.

## Collections
users, placement_results, practice_attempts, pomodoros, assignments, classrooms, exam_results, posts, chat_messages — string uuid `id`, ISO tarih stringleri. Seed: `cd backend && python seed.py` (idempotent).
