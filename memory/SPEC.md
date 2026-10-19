# AkademiAI MVP Spec

## Purpose
Türkçe YKS öğrencilerine seviye testi, deneme performansı, grafiksel net karnesi, kişisel çalışma önerileri ve Sokratik AI koçu sunan çalışma alanı.

## Current flows
- Öğrenci dashboard: haftalık hedef, TYT puanı, net trendi ve kişisel öneriler.
- Seviye testi: 5 örnek TYT sorusu, cevap haritası, 4 yanlış 1 doğruyu götürür kuralı, sonuç analizi.
- Analiz: branş radar grafiği, kazanım karnesi, tahmini puan ve koç içgörüsü.
- Kişisel müfredat: önceliklendirilmiş görevler ve oturum başlatma.
- AI koçu: SSE üzerinden Sokratik yanıt; `GEMINI_API_KEY` varsa Gemini `gemini-3-flash-preview`, yoksa MOCK fallback.
- Öğretmen/yönetici: temel demo portalları; rol sekmesiyle classroom ve yönetim özetleri.

## Data model / API
- `GET /api/dashboard`
- `GET /api/assessment/questions`
- `POST /api/assessment/submit` body `{answers: {question_id: number}}`
- `GET /api/classroom/overview`
- `GET /api/admin/overview`
- `POST /api/chat/stream` SSE body `{session_id?, message, context?}`
- Assessment results and chat messages persist in MongoDB collections.

## Auth / roles
MVP’de gerçek authentication yoktur. Frontend rol seçimi öğretmen/yönetici temel ekranlarını demo olarak gösterir. Üretim auth ve yetkilendirme sonraki adımdır.

## Integrations
Gemini API anahtarı backend `.env` içine kullanıcı tarafından `GEMINI_API_KEY=...` olarak eklenecek. Anahtar yoksa chatbot MOCK yanıt üretir ve arayüz çalışmaya devam eder.