# Issues — مشاكل مرصودة

> آخر تحديث: 2026-03-18 — جلسة الاختبار المنهجية (19 خطوة)

---

## نتائج جلسة الاختبار المنهجية

| الخطوة | الحالة | الوصف |
|--------|--------|-------|
| 1  | ✅ | فتح التطبيق والتنقل |
| 2  | ✅ | إنشاء مشروع جديد |
| 3  | ✅ | إدخال بيانات الأرض |
| 4  | ✅ | اختيار كود البناء وتحديث GCR |
| 5  | ✅ | تشغيل التحليل (API متاح) |
| 6  | ⚠️ | كود البناء "س111" غير موجود — انظر ISSUE-A |
| 7  | ✅ | عرض نتائج الجدوى |
| 8  | ✅ | عرض تقرير الجدوى |
| 9  | ✅ | عرض تقرير دراسة الأرض |
| 10 | ⚠️ | لا يوجد fallback محلي عند فشل API — انظر ISSUE-B |
| 11 | ✅ | عرض تقرير البنك |
| 12 | ✅ | عرض تقرير المساهم المؤسسي |
| 13 | ✅ | عرض تقرير المساهم الفردي |
| 14 | ✅ | أداة HBU (لها fallback محلي) |
| 15 | ✅ | أداة المزايدة (لها fallback محلي) |
| 16 | ✅ | أداة التحليل الحساسية (لها fallback محلي) |
| 17 | ✅ | أداة تحليل التوقيت (لها fallback محلي) |
| 18 | ✅ | حفظ المشروع وإعادة تحميله |
| 19 | ❌ | لا توجد واجهة لحذف المشروع — انظر ISSUE-C |

---

## ISSUE-A ✅ FIXED — كود البناء "س111" غير موجود في القائمة

**الخطوة:** 6 | **الأولوية:** متوسطة
**الملف:** `src/pages/analyzer/tabs/AnalyzerTab.tsx` — ثابت `BUILDING_CODES` (~السطر 45)

**المشكلة:**
قائمة `BUILDING_CODES` تحتوي على أسماء مؤقتة (`كود-1`, `كود-2`, `كود-3`) بينما الرموز السعودية الرسمية هي `س111`, `س112`, `س121` إلخ.

**الحل المقترح:** تحديث `BUILDING_CODES` لتشمل:
- `س111` — سكني فيلا (≤ 500م²)
- `س112` — سكني فيلا (> 500م²)
- `س121` — سكني شقق منخفض الارتفاع
- `س122` — سكني شقق متوسط الارتفاع
- `ت111` — تجاري محلات
- `ت121` — تجاري مكاتب

---

## ISSUE-B ✅ FIXED — runFull() لا يملك fallback محلي عند فشل الاتصال

**الخطوة:** 10 | **الأولوية:** عالية
**الملف:** `src/pages/analyzer/tabs/AnalyzerTab.tsx` — ~السطر 302-304

**المشكلة:**
catch block في `handleRunFull` يعرض `toast.error()` فقط بدون نتائج:
```typescript
} catch (err) {
  toast.error('فشل التحليل');
}
```
بينما HBU والمزايدة والحساسية والتوقيت كلها تملك fallback محلي.

**الحل المقترح:** إضافة fallback في catch يستدعي `feasibilityEngine.calculate()` و `regulationEngine.check()` مباشرة.

---

## ISSUE-C ✅ FIXED — لا توجد واجهة لحذف المشروع

**الخطوة:** 19 | **الأولوية:** عالية
**الملفات:**
- `src/pages/projects/ProjectsPage.tsx` — لا يوجد زر حذف
- `src/pages/dashboard/DashboardPage.tsx` — لا يوجد زر حذف

**المشكلة:** `projectsAPI.delete(id)` موجودة في طبقة API لكن لا زر ولا dialog تأكيد في الواجهة.

**الحل المقترح:**
1. زر حذف (أيقونة سلة) بجانب كل مشروع في القائمة
2. Dialog تأكيد: "هل تريد حذف [اسم المشروع]؟ لا يمكن التراجع"
3. استدعاء `projectsAPI.delete(id)` ثم تحديث القائمة
4. إذا كان المحذوف هو `currentProject` → مسح الاختيار

---

## ترتيب الإصلاح المقترح

1. **ISSUE-C** — حذف المشروع (وظيفة أساسية مفقودة)
2. **ISSUE-B** — Fallback لـ runFull() (يؤثر على الاستخدام بدون إنترنت)
3. **ISSUE-A** — رموز البناء السعودية (دقة البيانات)

---

## مشاكل مرصودة من قبل (لم تُصلَح أثناء إعادة الهيكلة)

> ملاحظة: هذه المشاكل موجودة في الكود الأصلي ولم تُلمس أثناء إعادة الهيكلة.

---

## 1. store/analysisStore.ts ✅ FIXED — نقل AnalysisContext إلى Zustand
**الوضع:** تم نقل كل الحالة من React Context إلى Zustand مع persist على sessionStorage
- `context/AnalysisContext.tsx` محذوف
- `store/analysisStore.ts` يحتوي `useAnalysisStore` + `useAnalysis` (نفس الـ API)
- `hooks/useAnalysis.ts` يُعيد تصدير من الـ store
- 12 ملف محدَّث ليستخدم `hooks/useAnalysis`
- `AnalysisProvider` محذوف من App.tsx (Zustand لا يحتاج provider)

---

## 2. pages/analyzer/tabs/ ✅ FIXED — حذف الـ aliases
**الوضع:** BasicTab.tsx, CostsTab.tsx, FinancingTab.tsx محذوفة (لم يكن يستوردها أي ملف)

---

## 3. engines/ ✅ FIXED — توصيل المحركات بالصفحات المتبقية
**StressTestPage:** fallback محلي يستخدم `runStressTest` من `engines/scenarios`
**RlvTab:** fallback محلي يستخدم `calculateAreas + calculateCosts + calculateRLV` من `engines/feasibility`
جميع 7 صفحات tools لديها الآن fallback محلي بدون اتصال بالإنترنت

---

## 4. utils/format.ts ✅ FIXED — تم توحيد دوال التنسيق
**الوضع:** تم استبدال النسخ المحلية في 5 ملفات بـ import من utils/format.ts
- BnmBox.tsx, ReportsPage.tsx, InternalReport.tsx, ShareholderIndividualReport.tsx, ShareholderInstitutionalReport.tsx

---

## 5. pages/tools/ ✅ FIXED — إضافة routes مستقلة
Routes جديدة: `/tools/auction` `/tools/hbu` `/tools/sensitivity` `/tools/stress` `/tools/timing`
`ToolPage` wrapper في App.tsx يمرّر `currentProject` لكل صفحة أداة

---

## 6. pages/market/MarketPage.tsx ✅ FIXED — صفحة بيانات السوق
3 أقسام: مؤشرات السوق (6 بطاقات) + أسعار الأراضي بالمدينة + تكاليف البناء بالنوع
بيانات مرجعية سعودية محلية + زر تحديث من marketAPI (مع fallback عند الخطأ)
Route `/market` مضاف في App.tsx + رابط "بيانات السوق" في Sidebar

---

## 7. bundle size ✅ FIXED — تم تقسيم الـ bundle
**الوضع:** main chunk انخفض من 979 KB → 178 KB
**الحل:** manualChunks في vite.config.ts + lazy loading للتقارير/Admin/Documents
- vendor-react: 161 KB | vendor-charts: 432 KB | vendor-query: 41 KB | vendor-http: 37 KB
- ReportsPage: 115 KB (lazy) | PdfExtractPage: 7 KB (lazy) | AdminPage: 5 KB (lazy)
