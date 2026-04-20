# بصيرة — توثيق النظام الكامل
### Basira Real Estate Intelligence Platform — Full System Documentation
**الإصدار:** v4 (Two-Tier Reports)  
**التقنية:** React 18 + TypeScript + Vite 6 + Zustand + TanStack Query  
**الاتجاه:** RTL — عربي أولاً

---

## جدول المحتويات

1. [نظرة عامة على النظام](#1-نظرة-عامة-على-النظام)
2. [هيكل الصفحات والتنقل](#2-هيكل-الصفحات-والتنقل)
3. [محرك الجدوى المالية](#3-محرك-الجدوى-المالية)
4. [محرك حساب المساحات](#4-محرك-حساب-المساحات)
5. [محرك حساب التكاليف](#5-محرك-حساب-التكاليف)
6. [محرك الإيرادات](#6-محرك-الإيرادات)
7. [محركات السيناريوهات والأدوات](#7-محركات-السيناريوهات-والأدوات)
8. [نظام تقييم الموقع](#8-نظام-تقييم-الموقع)
9. [نظام الثقة والجاهزية](#9-نظام-الثقة-والجاهزية)
10. [نظام التقارير الاستشارية](#10-نظام-التقارير-الاستشارية)
11. [محرك توزيع الأرباح](#11-محرك-توزيع-الأرباح)
12. [أكواد البناء السعودية](#12-أكواد-البناء-السعودية)
13. [إدارة الحالة — Zustand Store](#13-إدارة-الحالة--zustand-store)
14. [نظام الإعدادات](#14-نظام-الإعدادات)
15. [أدوات التحليل المتقدم](#15-أدوات-التحليل-المتقدم)
16. [تدفق البيانات الكامل](#16-تدفق-البيانات-الكامل)
17. [أنواع البيانات الرئيسية](#17-أنواع-البيانات-الرئيسية)
18. [قيود وملاحظات تصميمية](#18-قيود-وملاحظات-تصميمية)

---

## 1. نظرة عامة على النظام

بصيرة منصة تحليل استثمارية عقارية متكاملة مخصصة للسوق السعودي. تقدم نمذجة مالية على مستوى مؤسسي، تحقق من الامتثال التنظيمي، تخطيطاً للسيناريوهات، وتوليد تقارير استثمارية مصنفة.

### الخصائص الجوهرية

| الخاصية | التفاصيل |
|---------|----------|
| **نوع المنصة** | تطبيق ويب — SPA (React) |
| **الهدف الأساسي** | تحليل جدوى مشاريع التطوير العقاري |
| **السوق المستهدف** | المملكة العربية السعودية |
| **أنواع المستخدمين** | مطورون عقاريون، مستثمرون، مصارف، مستشارون |
| **لغة الواجهة** | عربي (RTL أولاً) |
| **المصادقة** | JWT — تخزين في localStorage |
| **الحساب** | محلي بالكامل (بدون API للمحركات) مع fallback ذكي |
| **الاستمرارية** | Zustand persist → localStorage |

### مكدس التقنيات

```
Frontend:   React 18 + TypeScript 5
Build:      Vite 6
State:      Zustand + persist middleware
Routing:    React Router v6
HTTP:       TanStack Query v5 + Axios
Charts:     Recharts
PDF/Print:  Browser native print + CSS @media print
Styling:    Tailwind CSS + Inline styles
Animation:  Framer Motion
Toasts:     React Hot Toast
```

---

## 2. هيكل الصفحات والتنقل

### خريطة الصفحات

```
/login                          ← تسجيل الدخول
/dashboard                      ← لوحة التحكم الرئيسية
/projects                       ← قائمة المشاريع
/project/:id#summary            ← ملخص المشروع
/project/:id#dimensions         ← بيانات الأبعاد
/project/:id#basics             ← تحليل الجدوى الأساسي
/project/:id#costs              ← التكاليف والتمويل
/project/:id#finance            ← هيكل التمويل
/project/:id#marketdata         ← بيانات السوق والمقارنات
/project/:id#results            ← نتائج التحليل
/project/:id#sensitivity        ← تحليل الحساسية
/project/:id#timing             ← الزمن والتأخير
/project/:id#hbu                ← أفضل استخدام (HBU)
/project/:id#stress             ← اختبار الضغط
/project/:id#advisory           ← التقرير الاستشاري
/project/:id#reports            ← تقارير PDF
/project/:id#history            ← سجل الإصدارات
/reports                        ← مركز التقارير
/report/advisory/:id            ← التقرير الاستشاري المستقل (للطباعة)
/documents                      ← استخراج PDF
/market                         ← بيانات السوق
/tools/auction                  ← أداة المزاد
/tools/hbu                      ← HBU مستقل
/tools/sensitivity              ← تحليل الحساسية مستقل
/tools/stress                   ← اختبار الضغط مستقل
/tools/timing                   ← الزمنية مستقل
/admin                          ← إدارة النظام
/settings/zoning-config         ← إعدادات أكواد البناء + مزايا الموقع
/settings/location-scoring      ← إعدادات الأوزان العامة للموقع
```

### صفحة لوحة التحكم (`DashboardPage`)

**الهدف:** نقطة الدخول الرئيسية مع ماسح سريع للجدوى.

**الماسح السريع (Quick Scanner):**
- يدعم أكواد: س111، س121، س122، ت111، ت121
- مدخلات: مساحة الأرض، سعر الأرض/م²، سعر البيع/م²، تكلفة البناء/م²
- الإخراج الفوري: IRR تقريبي، هامش الربح، قرار الشراء، RLV
- يستخدم `irrApprox` (CAGR، ليس دقيقاً) — للاستئناس فقط
- زر "حفظ كمشروع" → ينقل البيانات لمشروع جديد

**قائمة المشاريع:**
- شارات الحالة: مسودة، نشط، مكتمل، مؤرشف
- روابط مباشرة للقسم الأخير المفتوح

---

### صفحة المشروع (`ProjectFlow`)

المشروع يمر بمرحلتين محددتين (`FlowStep`):

| المرحلة | الوصف |
|---------|-------|
| `analysis` | إدخال البيانات + تشغيل المحركات + عرض النتائج |
| `report_builder` | بناء محتوى التقرير + الملخص التنفيذي |

**تبويبات الإدخال:**

#### تبويب الأبعاد (`DimensionsTab`)
- مساحة الأرض (م²)
- عدد الأدوار
- نسبة تغطية الأرض (GCR)
- نسبة الخدمات (15% افتراضي)
- عدد الأدوار البدرومية (اختياري)

#### تبويب الأساسي (`AnalyzerTab`)
- **اختيار كود البناء** (9 أكواد + مخصصة):
  - يُطبّق الكود تلقائياً: GCR، عدد الأدوار، نوع الأرض، الخدمات
  - عرض كامل للكود: الفصلات، الارتدادات، الاستخدامات المسموحة، المواقف
- سعر الأرض/م²
- سعر البيع/م²
- مدة المشروع (شهراً)
- نمط التشغيل: بيع أو إيجار
- مزيج الوحدات (اختياري)

#### تبويب التكاليف (`CostsTab`)
- تكلفة البناء/م²
- نسبة التكاليف الناعمة
- نسبة الاحتياطي الطارئ
- معاملات البدروم (حفر، هيكل، عزل، MEP)

#### تبويب التمويل (`FinanceTab`)
- نسب التمويل: ذاتي / بنكي / شريك
- معدل الفائدة البنكية %
- سنوات القرض
- LTV البنكي %
- فترة السماح (شهوراً)
- معدل الغرامة المبكرة %
- شهر بدء القرض
- عدد شرائح الصرف (1–6)
- رسملة الفوائد خلال السماح (نعم/لا)

#### تبويب بيانات السوق (`MarketDataTab`)
- مشاريع مقارنة (≥3 للتقرير الاستثماري):
  - اسم المشروع، الموقع
  - سعر البيع/م²، نسبة المباع %، مدة التسليم
  - نوع المصدر: حكومي / تقييم معتمد / وسيط / إكسل / يدوي
  - توثيق: نعم/لا + طريقة + ملاحظة
- تقرير التقييم (نعم/لا)
- مصدر بيانات السوق
- وثيقة التصنيف العمراني (رسمي/يدوي)
- عروض المقاولين (عدد)
- سلامة الوضع القانوني للأرض

---

## 3. محرك الجدوى المالية

**الملف:** `src/engines/feasibility/financialEngine.ts`

### الدالة الرئيسية: `runFeasibility(input: FeasibilityInput)`

**المنسّق الكامل** — يستدعي كل المحركات الفرعية بالتسلسل:

```
FeasibilityInput
    ↓
1. calculateAreas()         → AreaResult
2. calculateCosts()         → CostResult  
3. calculateRevenue()       → revenue number
4. buildCashFlowTimeline()  → number[] (تدفق شهري)
5. irrFromCashFlows()       → IRR دقيق
6. runComplianceChecks()    → ComplianceResult
7. calculateRLV()           → {maxLandPerM2, maxLandBudget}
    ↓
FeasibilityResult (كامل)
```

### حساب IRR — Newton-Raphson

الطريقة الدقيقة (للتقارير):

```
f(r)  = Σ [ CF_t / (1+r)^t ]     ← NPV عند معدل r
f'(r) = Σ [ -t × CF_t / (1+r)^(t+1) ]

r_new = r_old - f(r_old) / f'(r_old)

تكرار حتى |f(r)| < 1e-7  أو 300 تكرار

IRR السنوي = (1 + r_شهري)^12 - 1
```

الطريقة التقريبية (للوحة التحكم فقط):
```
IRR ≈ (net / totalCost)^(12/months) - 1   ← CAGR
```

> **تحذير:** الطريقة التقريبية للاستئناس فقط — لا تُستخدم في التقارير.

### بناء التدفق النقدي (`buildCashFlowTimeline`)

```
الشهر 0:                    −landCost   (دفعة الأرض)

الشهر 1 → (65% × duration):  −costPerMonth  (S-curve بناء)
    costPerMonth = constructionCost / (0.65 × durationMonths)

الشهر (66% × duration) → duration:  +revenuePerMonth  (مبيعات خطية)
    revenuePerMonth = revenue / (0.35 × durationMonths)
```

### NPV (صافي القيمة الحالية)

```
معدل الخصم = 8% سنوياً (HURDLE_RATE)
معدل شهري = (1.08)^(1/12) - 1

NPV = Σ [ CF_t / (1 + rShehri)^t ]
      t=0 → n
```

### RLV (قيمة الأرض المتبقية)

```
maxLandBudget = revenue × (1 − profitTarget) − constructionCostExclLand
maxLandPerM2  = maxLandBudget / landArea
```

### تحذيرات الإدخال (inputWarnings)

| الحقل | الحد الأدنى | الحد الأقصى |
|-------|------------|------------|
| سعر الأرض/م² | 100 ر.س | 40,000 ر.س |
| سعر البيع/م² | 800 ر.س | 40,000 ر.س |
| تكلفة البناء/م² | 800 ر.س | 8,000 ر.س |
| نسبة سعر البيع إلى الأرض | — | 8× |
| IRR | — | 150% (مؤشر خطأ) |

---

## 4. محرك حساب المساحات

**الملف:** `src/engines/feasibility/areaCalculator.ts`

### المعادلات الأساسية

```
aboveGroundGFA      = landArea × GCR × floors
aboveGroundSellable = aboveGroundGFA × (1 − servicesRatio)
aboveGroundServices = aboveGroundGFA × servicesRatio

basementGFA         = landArea × 0.90 × basementFloors
basementParkingArea = basementGFA  (الكل للمواقف)
parkingSupplySpots  = ⌊basementGFA / 15⌋   (15م²/موقف)

grossBuildArea      = aboveGroundGFA + basementGFA
sellableArea        = aboveGroundSellable   (البدروم لا يُباع أبداً)
```

### حساب المواقف

```
طلب المواقف (per unit):
  وحدة < 180م²  → 1 موقف
  وحدة ≥ 180م²  → 2 مواقف

بدون مزيج وحدات (fallback):
  parkingDemand = ⌈sellableArea / 100⌉

فجوة المواقف = max(0, demand − supply)
```

### ثوابت المحرك

| الثابت | القيمة | المعنى |
|--------|--------|--------|
| `BASEMENT_COVERAGE` | 0.90 | البدروم يغطي 90% من قطعة الأرض |
| `SQMPERSPOT` | 15 | م² لكل موقف (شامل الممرات) |
| `servicesRatio` | 0.15 | 15% من GFA للخدمات (سلالم، ممرات، شافت) |

> **قاعدة ثابتة:** البدروم مركز تكلفة فقط — لا يدخل في المساحات القابلة للبيع أبداً.

---

## 5. محرك حساب التكاليف

**الملف:** `src/engines/feasibility/costCalculator.ts`

### هيكل التكاليف الكامل

```
تكلفة الأرض:
  landBaseCost = landArea × landPricePerM2
  RETT (ضريبة التصرفات) = landBaseCost × 0.05
  landCost = landBaseCost × 1.05

تكلفة البناء فوق الأرض:
  aboveGroundBuildCost = aboveGroundGFA × buildCostPerM2

تكلفة البدروم (بكل العلاوات):
  basementBase         = basementGFA × buildCostPerM2
  excavation           = basementGFA × 350  (حفر)
  structural           = basementGFA × 500  (هيكل إضافي)
  waterproofing        = basementGFA × 250  (عزل مائي)
  mep                  = basementGFA × 300  (تمديدات)
  basementTotalCost    = مجموع كل ما سبق

التكاليف الناعمة:
  softCosts = (aboveGroundBuildCost + basementTotalCost) × softCostsPct

الاحتياطي:
  contingency = (aboveGroundBuildCost + basementTotalCost) × contingencyPct

التسويق والعمولة:
  agentCommission = revenue × 0.02   (2% عمولة وسيط)
  marketingBudget = revenue × 0.01   (1% تسويق)

التمويل البنكي:
  loanAmount      = totalCost × bankPct
  financingCost   = loanAmount × interestRate × durationYears

مجموع التكاليف:
  totalCost = landCost + aboveGroundBuildCost + basementTotalCost
            + softCosts + contingency + marketingCost + financingCost
```

### معاملات البدروم الافتراضية

| المكوّن | التكلفة/م² |
|---------|----------|
| الحفر والتربة | 350 ر.س |
| العلاوة الإنشائية | 500 ر.س |
| العزل المائي | 250 ر.س |
| التمديدات الكهروميكانيكية | 300 ر.س |
| **المجموع الإضافي** | **1,400 ر.س/م²** |

---

## 6. محرك الإيرادات

**الملف:** `src/engines/feasibility/revenueCalculator.ts`

### طريقتا الحساب

#### الطريقة 1: سعر مدمج (Blended Price)
```
revenue = sellableArea × sellPricePerM2
```

#### الطريقة 2: مزيج وحدات (Unit Mix)
```
لكل نوع وحدة:
  unitRevenue = count × avgAreaM2 × pricePerM2

totalRevenue  = Σ unitRevenue
blendedPrice  = totalRevenue / Σ(count × avgAreaM2)
```

#### نموذج الإيجار
```
annualRent       = sellableArea × rentPerM2Year × occupancyRate (90%)
capitalisedValue = annualRent / capitalRate
yieldPct         = annualRent / totalCost × 100
```

### النتائج المالية المشتقة

```
netProfit = revenue − totalCost
margin    = (netProfit / revenue) × 100
roi       = (netProfit / totalCost) × 100
payback   = (totalCost / revenue) × durationMonths
```

---

## 7. محركات السيناريوهات والأدوات

### 7.1 تحليل الحساسية (`sensitivityEngine`)

**الملف:** `src/engines/scenarios/sensitivityEngine.ts`

#### مصفوفة الحساسية

```
المتغيرات المختبرة: سعر البيع/م²، تكلفة البناء/م²، سعر الأرض/م²
التباينات: ±20%، ±15%، ±10%، ±5%، قاعدة

المعادلة الخطية:
  ΔirrPct = elasticity[key] × variationPct
  newIRR  = baseIRR × (1 + ΔirrPct/100)

معاملات المرونة الافتراضية:
  sellPricePerM2:  +1.2  (زيادة 1% في السعر → +1.2% في IRR)
  buildCostPerM2:  -0.6  (زيادة 1% في التكلفة → -0.6% في IRR)
  landPricePerM2:  -0.4  (زيادة 1% في الأرض → -0.4% في IRR)
```

#### اختبار الضغط (`runStressTest`)

```
سيناريوهات انخفاض السعر: -5%، -10%، -15%، -20%، -25%، -30%

لكل سيناريو:
  adjRevenue = baseRevenue × (1 − dropPct)
  adjNet     = adjRevenue − totalCost
  adjIRR     = approximateIRR(adjNet, totalCost, months)

سعر التعادل = totalCost / NLA
هامش الأمان = ((currentPrice − breakEven) / currentPrice) × 100
```

---

### 7.2 أفضل استخدام HBU (`hbuEngine`)

**الملف:** `src/engines/scenarios/hbuEngine.ts`

#### سيناريوهات HBU_SCENARIOS

| السيناريو | الأدوار | GCR | تكلفة البناء/م² | النوع |
|-----------|---------|-----|-----------------|-------|
| فيلا | 2 | 0.60 | 2,500 ر.س | سكني |
| فلل متلاصقة | 3 | 0.60 | 2,000 ر.س | سكني |
| شقق | 4 | 0.60 | 1,800 ر.س | سكني |
| تجاري | 3 | 0.80 | 1,600 ر.س | تجاري |
| مكاتب | 5 | 0.80 | 2,200 ر.س | تجاري |
| مختلط | 6 | 0.75 | 2,100 ر.س | تجاري |

```
لكل سيناريو:
  NLA     = landArea × GCR × floors × 0.85
  revenue = NLA × sellPrice(residential|commercial)
  IRR     ≈ (net / totalCost) × (12 / months) × 100
```

**الفلترة:** كود س → سكني فقط / كود ت → تجاري فقط / بقية الأكواد → كلاهما

---

### 7.3 استراتيجية المزاد (`auctionEngine`)

**الملف:** `src/engines/scenarios/auctionEngine.ts`

#### ثلاث شرائح عروض

| الشريحة | النسبة من الحد الأقصى | احتمالية الفوز |
|---------|----------------------|----------------|
| محافظة (Conservative) | 85% | 85% |
| معتدلة (Moderate) | 100% | 60% |
| عدوانية (Aggressive) | 105–110% | 35% |

```
الحد الأقصى للأرض:
  maxBudget    = revenue × (1 − targetMargin) − constructionCost
  maxBidPerM2  = maxBudget / landArea

العرض المقترح:
  recommendedBid = maxBidPerM2 × 0.85  (هامش أمان 15%)
  startingBid    = recommendedBid × 0.70

DSCR (نسبة تغطية الدين):
  DSCR = adjNet / (bankAmount + interest)
  
LTC (القرض / التكلفة):
  LTC = bankAmount / totalCost × 100
```

---

### 7.4 التحليل الزمني (`timingEngine`)

**الملف:** `src/engines/scenarios/timingEngine.ts`

#### تأثير المدة

```
للمدد: 12، 18، 24، 30، 36، 42، 48، 60 شهراً

لكل مدة:
  marginalInterest = interest(duration) − interest(baseDuration)
  adjNet = baseNet − marginalInterest
  adjIRR = (adjNet / totalCost)^(12/months) − 1
```

#### تأثير التأخير

```
للتأخيرات: 0، 3، 6، 9، 12، 18، 24 شهراً

فائدة مُطفأة (Amortized):
  M = P × [r(1+r)^n] / [(1+r)^n − 1]   ← القسط الشهري
  totalInterest = M × n − P

adjNet   = baseNet − (interestWithDelay − baseInterest)
DSCR     = adjNet / totalDebt
حالة DSCR:
  ≥ 1.25  → آمن
  1.0–1.25 → تحذير
  < 1.0   → خطر
```

---

## 8. نظام تقييم الموقع

### 8.1 هيكل أكواد الموقع

**الملف:** `src/lib/config/locationConfig.ts`

كل كود بناء في الـ Store يحمل `ZoningConfig` يتضمن:

```typescript
interface ZoningConfig {
  code:      string;         // الكود (مطابق لكود الإدخال)
  label:     string;         // الاسم العربي
  usageType: 'residential' | 'commercial' | 'office' | 'mixed';

  rules: {
    idealStreetWidth: number;   // عرض الشارع المثالي (م)
    minStreetWidth:   number;   // الحد الأدنى (م)
    maxFloors?:       number;   // أقصى أدوار
    minLandArea?:     number;   // أدنى مساحة أرض (م²)
  };

  weights: {          // أوزان 0-1 (مجموع = 1)
    streetWidth:    number;
    amenities:      number;
    infrastructure: number;
    location:       number;
  };

  amenityWeights: {   // أوزان 0-1 (مجموع = 1)
    mosque: number; supermarket: number; mall: number;
    school: number; park: number; metro: number; bus: number;
  };

  infraWeights: {     // أوزان 0-1 (مجموع = 1)
    electricity: number; water: number; sewage: number;
    fiber: number; flood: number;
  };

  landAdvantages: {   // مزايا تلقائية عند تحقق الشرط
    trigger:   string;  // شرط JavaScript محدود
    advantage: string;  // نص يظهر في التقرير
    weight:    'high' | 'medium' | 'low';
  }[];

  locationFeatures?: {  // مزايا الموقع المرجحة (مجموع = 100)
    features: {
      key:    string;   // 'streetWidth' | 'mosque' | 'school' | ...
      label:  string;
      weight: number;   // 0-100
    }[];
  };
}
```

### 8.2 المحرك — `calculateLocationScore`

**الملف:** `src/lib/engines/locationScoringEngine.ts`

#### مراحل الحساب

**المرحلة 1: البحث عن الكود**
```typescript
config = zoningConfigs.find(z => z.code === project.zoningCode)
      ?? zoningConfigs.find(z => z.usageType === normalizeUsage(project.usageType))
      ?? zoningConfigs[0]
```

**المرحلة 2: درجة عرض الشارع**
```
streetWidth >= idealStreetWidth  → streetScore = 100
streetWidth >= minStreetWidth    → streetScore = 50 + (ratio × 40)  [خطي]
streetWidth > 0 (أقل من min)    → streetScore = 25
streetWidth = 0 (غير محدد)      → streetScore = 50 (تقديري)
```

**المرحلة 3: الدرجة الأساسية**
```
total = streetScore    × weights.streetWidth
      + amenitiesScore × weights.amenities      (62 ثابت حالياً)
      + infraScore     × weights.infrastructure
      + locationScore  × weights.location       (65 ثابت حالياً)
```

**المرحلة 4: طبقة مزايا الموقع (Priority 1)**
```
إذا وُجد config.locationFeatures:
  لكل ميزة f في locationFeatures.features:
    value = computeFeatureValue(f.key, project, config)
    score += value × (f.weight / 100)
  
  finalScore = round(score × 100)
```

**المرحلة 5: Fallback من LocationConfig**
```
إذا لم تكن locationFeatures موجودة:
  تفحص locationConfig.landFeaturesByCode[zoningCode]
```

#### قيم الميزات

| مفتاح الميزة | طريقة الحساب |
|-------------|-------------|
| `streetWidth` | 1.0 إذا ≥ ideal، خطي بين min/ideal، 0 إذا < min |
| `mosque` | 1.0 إذا true، 0.5 إذا undefined، 0 إذا false |
| `school` | نفس mosque |
| `supermarket` | نفس mosque |
| `mall` | نفس mosque |
| `park` | نفس mosque |
| `metro` | نفس mosque |
| `bus` | نفس mosque |
| `infrastructure` | `project.infrastructureScore ?? 0.7` |

> **ملاحظة مهمة:** حقول المرافق (hasMosqueNearby، hasSchoolNearby، إلخ) لم تُضف بعد لنموذج الإدخال — تأخذ 0.5 دائماً (محايد).

### 8.3 درجات التقييم

| الدرجة | النطاق |
|--------|--------|
| ممتاز | ≥ 85 |
| جيد جداً | 70–84 |
| جيد | 55–69 |
| مقبول | 40–54 |
| ضعيف | < 40 |

### 8.4 مزايا الأرض التلقائية (`landAdvantages`)

```typescript
// يُقيَّم الشرط بـ Function() مُقيَّد:
trigger المدعومة:
  streetWidth >= idealStreetWidth
  streetWidth >= minStreetWidth && streetWidth < idealStreetWidth
  landArea >= {رقم}
  floorsCount >= {رقم}
```

---

## 9. نظام الثقة والجاهزية

**الملف:** `src/lib/engines/confidenceEngine.ts`

### 9.1 Quality Gate (`calculateReadiness`)

**6 مدخلات إلزامية:**

| المدخل | الوصف | الوزن |
|--------|-------|-------|
| تقرير تقييم | من مقيّم معتمد | إلزامي |
| ≥3 مقارنات | مشاريع مشابهة موثقة | إلزامي |
| مصدر بيانات السوق | MOJ / إتقان / تقييم | إلزامي |
| وثيقة التصنيف | رسمي أو موثق | إلزامي |
| ≥3 عروض مقاولين | أسعار بناء موثقة | إلزامي |
| سلامة الوضع القانوني | خلو من النزاعات | إلزامي |

```
readinessScore = (المدخلات المكتملة / 6) × 100
gate.passed = readinessScore === 100
```

### 9.2 درجة الثقة (`calculateConfidence`)

```
Coverage (40%):
  comps ≥ 3 → 1.0 | comps = 2 → 0.7 | comps = 1 → 0.4 | comps = 0 → 0
  hasAppraisal = +0.35
  hasQuotes ≥ 3 = +0.25

Quality (35%):
  أوزان المصادر:
    government (MOJ):          1.0
    certified_appraisal:       0.9
    broker_data:               0.7
    internal_excel:            0.5
    manual_input:              0.3
  
  توثيق موثق verified:         +0.10–0.15

Consistency (25%):
  devFromAvg = |price - avgPrice| / avgPrice
  إذا dev ≤ 10%: consistencyScore = 1.0
  إذا dev > 30%: consistencyScore = 0
  خلاف ذلك: خطي بين 0 و 1

total = coverage×0.40 + quality×0.35 + consistency×0.25  (× 100)
```

### 9.3 تصنيف التقرير

| التصنيف | الشرط | الاستخدام المسموح |
|---------|-------|------------------|
| **استثماري** (investment) | readiness = 100% + confidence ≥ 80% | بنكي / خارجي / داخلي |
| **مشروط** (conditional) | readiness ≥ 50% + confidence 60–79% | خارجي مع تحذير |
| **استرشادي** (indicative) | confidence < 60% | داخلي فقط |

---

## 10. نظام التقارير الاستشارية

**الملف:** `src/pages/reports/AdvisoryReportPage.tsx`

### 10.1 أقسام التقرير (10 أقسام)

| القسم | المحتوى |
|-------|---------|
| **1. الغلاف والهوية** | اسم المشروع، الموقع، التاريخ، شعار الشركة، شارة التصنيف |
| **2. الملخص التنفيذي** | نص مُولَّد تلقائياً حسب الجمهور + الثقة |
| **3. بيانات المشروع** | الأبعاد، التكاليف، إحصاءات المساحة، الكود النظامي |
| **4. تحليل السوق** | المقارنات، الأسعار، نسب البيع، توصية السوق |
| **5. تحليل الموقع** | درجة الموقع/100، تفاصيل المزايا، الإيجابيات والتحفظات |
| **6. التحليل المالي** | IRR، NPV، هامش، ROI، RLV، هيكل التكاليف |
| **7. التدفق النقدي** | جدول شهري + تراكمي + مخطط بياني |
| **8. تحليل الحساسية** | ±20% لأسعار البيع والبناء والأرض |
| **9. جودة البيانات** | درجة الثقة المفصلة، حالة Gate، مصادر البيانات |
| **10. القانوني والإفصاح** | شروط الاستخدام، جمهور التقرير، تحذير الاستخدام |

### 10.2 الملخص التنفيذي (`executiveSummaryEngine`)

**الملف:** `src/lib/engines/executiveSummaryEngine.ts`

**أنماط النبرة:**

| النبرة | الشرط | الأسلوب |
|--------|-------|---------|
| **Strong** | ثقة ≥ 80% | توصية قوية بالمضي |
| **Balanced** | ثقة 60–79% | موافقة حذرة مع تحفظات |
| **Cautious** | ثقة < 60% | إبراز المخاوف، توصية بدراسة إضافية |

**كتل النص حسب الجمهور:**

| الجمهور | محتوى الكتلة الخاصة |
|---------|-------------------|
| `internal` | تقييم الحساسية + توصية داخلية |
| `bank` | IRR، صافي الربح، DSCR، مدة الاسترداد |
| `individual` | موقع السوق، العائد، الميزة التنافسية |
| `institutional` | ملخص استثماري رسمي + مؤشرات المخاطر |

### 10.3 قرار الاستثمار

```
IRR ≥ 20%  → "يُوصى بالمضي — عائد ممتاز"     (أخضر)
IRR 15–20% → "مقبول مع مراجعة هيكل التمويل"  (أصفر)
IRR < 15%  → "يحتاج إعادة هيكلة قبل المضي"   (أحمر)
```

### 10.4 طبقة مصادر البيانات (`SourceBadge`)

| النوع | اللون | المعنى |
|-------|-------|--------|
| `manual` | رمادي | بيانات مدخلة يدوياً |
| `derived` | أزرق | محتسب تلقائياً |
| `erp` | أخضر | من نظام ERP |
| `market` | عنبري | بيانات سوق |

### 10.5 مراحل بناء التقرير (`ReportBuilderDrawer`)

5 أقسام accordion:

| القسم | المحتوى القابل للتعديل |
|-------|----------------------|
| **الملخص التنفيذي** | نص مُولَّد / يدوي + الجمهور |
| **وصف المشروع** | النص التسويقي + مزايا الأرض المُفعَّلة |
| **تحليل التسعير** | تقييم السوق + التبرير |
| **جدول الوحدات** | أنواع الوحدات + المساحات + الأسعار + الإيرادات |
| **توزيع الأرباح** | نسب البنك / المطور / المستثمر |

---

## 11. محرك توزيع الأرباح

**الملف:** `src/lib/engines/distributionEngine.ts`

### المعادلات

```
bankLoan           = totalCost × (bankFinancingPercent / 100)
equity             = totalCost − bankLoan
developerCapital   = equity × (developerCapitalPercent / 100)
investorCapital    = equity × (investorCapitalPercent / 100)

bankInterestCost   = bankLoan × (bankInterestRate / 100) × (durationMonths / 12)
developerFee       = constructionCost × (developerFeeOnConstruction / 100)

distributableProfit = max(0, netProfit − bankInterestCost − developerFee)
developerShare      = distributableProfit × (developerProfitSharePercent / 100)
investorShare       = distributableProfit × (1 − developerProfitSharePercent / 100)

developerTotalReturn = developerFee + developerShare
investorTotalReturn  = investorShare

developerROI = developerTotalReturn / developerCapital × 100
investorROI  = investorTotalReturn  / investorCapital  × 100
```

---

## 12. أكواد البناء السعودية

**المصدر:** `src/pages/analyzer/tabs/AnalyzerTab.tsx` + `src/lib/config/locationConfig.ts`

### الأكواد الرسمية (لائحة اشتراطات البناء السعودية)

| الكود | الاسم | الأدوار | GCR | الشارع الأدنى | الشارع الأقصى |
|-------|-------|---------|-----|--------------|--------------|
| **س111** | سكني — فيلا (أرض ≤500م²) | 2+ملحق | 65% | 10م | 20م |
| **س112** | سكني — فيلا (أرض >500م²) | 2+ملحق | 60% | 15م | — |
| **س121** | سكني — شقق منخفض (≤4 أدوار) | 4+ملحق | 60% | 20م | 30م |
| **س122** | سكني — شقق متوسط (5–9 أدوار) | 9 | 55% | 30م | 60م |
| **ت111** | تجاري — محلات (شارع ≤30م) | 2+ملحق | 70% | 15م | 30م |
| **ت121** | تجاري — مكاتب ومختلط (شارع >30م) | 6 | 60% | 30م | — |

### الأكواد المخصصة

| الكود | الاسم | ملاحظة |
|-------|-------|--------|
| **كود-1** | سكني — فلل، فلل متلاصقة، أدوار سكنية | للأغراض العامة |
| **كود-2** | مختلط — سكني / تجاري / مكتبي | — |
| **كود-3** | شقق سكنية | — |

### تأثير الكود عند التطبيق

```typescript
// عند اختيار الكود في النموذج:
setFormFields({
  zoningCode:          rawCode,
  groundCoverageRatio: String(c.groundCoverage),
  floors:              String(c.maxFloors + (c.hasAnnex ? 1 : 0)),
  landType:            c.landType,
  servicesAreaPct:     c.landType === 'تجاري' ? '0.20' : '0.15',
});
```

### الامتثال التنظيمي (`regulation` engine)

```
تحقق تلقائي:
  ✓ عرض الشارع ضمن نطاق الكود
  ✓ عدد الأدوار لا يتجاوز الحد
  ✓ GCR ضمن المسموح به
  ✓ الارتدادات كافية
  ✓ مواقف السيارات كافية
  ✓ استخدام الأرض مسموح به بالكود
```

---

## 13. إدارة الحالة — Zustand Store

**الملف:** `src/store/analysisStore.ts`

### الحالة المُستمرة (persist — localStorage)

```typescript
interface AnalysisState {
  // ── هوية المشروع النشط ──
  projectName:     string;
  projectLocation: string;

  // ── مدخلات الأرض ──
  landArea:       number;
  streetWidth:    number;
  landType:       string;
  regulatoryCode: string;
  usageType:      string;

  // ── الأسعار ──
  landPricePerM2: number;
  sellPricePerM2: number;

  // ── البناء ──
  buildCostPerM2: number;
  softCostsPct:   number;     // 0.05
  contingencyPct: number;     // 0.05
  floors:         number;     // 4
  groundCoverage: number;     // 0.6

  // ── التمويل ──
  financingStructure: FinancingStructure;

  // ── النتائج ──
  lastResult:  any;
  lastInput:   Partial<ProjectInput>;
  isAnalyzed:  boolean;

  // ── النماذج (per-project) ──
  formInput:    Record<string, string>;
  formProjectId: string | null;
  projectInputs: Record<string, Record<string, string>>;

  // ── البيانات (per-project) ──
  projectResults:         Record<string, any>;
  projectAdvisoryInputs:  Record<string, AdvisoryRequiredInputs>;
  projectSnapshots:       Record<string, ProjectSnapshot[]>;  // max 20
  projectFlowState:       Record<string, ProjectFlowEntry>;
  reportBuilder:          Record<string, ReportBuilderData>;

  // ── الإعدادات العامة ──
  zoningConfigs:  ZoningConfig[];
  locationConfig: LocationConfig;
}
```

### بنية التمويل (`FinancingStructure`)

```typescript
interface FinancingStructure {
  selfPct:              number;  // 1.0 (100% ذاتي افتراضياً)
  bankPct:              number;  // 0
  partnerPct:           number;  // 0
  bankInterestRate:     number;  // 7%
  bankYears:            number;  // 2
  bankLTV:              number;  // 70%
  gracePeriodMonths:    number;  // 0
  penaltyRate:          number;  // 2%
  loanDelayPenaltyPct:  number;  // 0
  loanStartMonth:       number;  // 1
  loanTranches:         number;  // 3
  capitalizeInterest:   boolean; // false
}
```

### Actions المتاحة

| الفئة | Actions |
|-------|---------|
| **التحليل** | `setAnalysis`, `clearAnalysis`, `setProjectResult` |
| **النماذج** | `setFormField`, `setFormFields`, `initFormForProject` |
| **الاستشاري** | `setAdvisoryInputs`, `saveProjectSnapshot` |
| **التقرير** | `setReportBuilder`, `updateReportBuilder` |
| **التدفق** | `setProjectFlowState` |
| **أكواد Zoning** | `setZoningConfigs`, `addZoningConfig`, `updateZoningConfig`, `deleteZoningConfig`, `resetZoningConfigs` |
| **إعدادات الموقع** | `setLocationConfig`, `resetLocationConfig` |
| **المدخلات المكتوبة** | `setProjectInfo`, `setLandInput`, `setFinancingStructure` |

### إصدارات الـ Store والـ Migrations

| الإصدار | التغيير |
|---------|---------|
| v1 | الإصدار الأولي |
| v2 | استبدال أكواد م122/م123/ت بالأكواد التسعة الحقيقية |

```typescript
migrate: (persisted, fromVersion) => {
  if (fromVersion < 2) {
    const OLD_CODES = new Set(['م122', 'م123', 'ت']);
    // إذا كانت فقط الأكواد القديمة → استبدل بالافتراضي الجديد
    if (hasOnlyOldCodes) persisted.zoningConfigs = DEFAULT_ZONING_CONFIGS;
  }
  return persisted;
}
```

---

## 14. نظام الإعدادات

### 14.1 صفحة أكواد البناء (`/settings/zoning-config`)

**تبويب: القواعد والأوزان**
- الأوزان الرئيسية (streetWidth / amenities / infrastructure / location) — مجموع = 1.0
- قواعد عرض الشارع (min / ideal / maxFloors)
- مزايا الأرض التلقائية (عرض نصي)

**تبويب: مزايا الموقع**
- جدول تعديل الأوزان لكل ميزة
- مؤشر بصري (شريط %) لكل ميزة
- تحقق من مجموع = 100%
- زر "إضافة مزايا افتراضية" للأكواد الجديدة

**إضافة كود جديد:**
- يُنشئ ZoningConfig كامل مع مزايا افتراضية
- يظهر فوراً في نموذج الإدخال (من الـ Store)

### 14.2 صفحة إعدادات الموقع (`/settings/location-scoring`)

- أوزان المعايير العامة (zoningFit / accessibility / amenities / infrastructure) — مجموع = 100
- قواعد الاستخدام (سكني/تجاري/مكتبي): min / ideal street width
- تحقق من المجموع

### 14.3 آلية التخصيص الكاملة

```
المطور يضبط في الإعدادات:
  ↓
ZoningConfig.locationFeatures.features[i].weight  (per-code weights)
  ↓
applyLocationConfig(zoningConfigs, locationConfig)  (global override)
  ↓
calculateLocationScore(project, mergedConfigs, locationConfig)
  ↓
النتيجة تنعكس في التقرير الاستشاري
```

---

## 15. أدوات التحليل المتقدم

### 15.1 تحليل الحساسية (`/tools/sensitivity`)

**الواجهة:**
- Tornado Chart: ±20% تأثير على IRR لكل متغير
- مصفوفة تفاعلية: جداول ±5/10/15/20% لكل متغير
- تبديل بين اللونين (أحمر/أخضر) حسب اتجاه التغيير
- Fallback محلي عند عدم توفر API

### 15.2 اختبار الضغط (`/tools/stress`)

**الواجهة:**
- جدول انخفاض الأسعار (5% → 30%)
- جدول التأخير (0 → 24 شهراً)
- سعر التعادل + هامش الأمان
- تلوين الخلايا حسب الخطورة

### 15.3 أفضل استخدام HBU (`/tools/hbu`)

**الواجهة:**
- مقارنة 6 سيناريوهات بصرياً (رادار + أعمدة)
- ترتيب حسب IRR × هامش
- تمييز السيناريو الأمثل
- مدخلات: سعر بيع سكني + سعر بيع تجاري منفصلان

### 15.4 استراتيجية المزاد (`/tools/auction`)

**الواجهة:**
- 3 عروض (محافظ/معتدل/عدواني) مع احتمالية الفوز
- مقارنة السعر التنافسي
- DSCR + LTC
- نصيحة: هل تستحق الأرض السعر المطروح؟

### 15.5 التحليل الزمني (`/tools/timing`)

**الواجهة:**
- منحنى IRR عبر مدد مختلفة
- جدول تأثير التأخير على IRR + DSCR
- ألوان DSCR: أخضر/أصفر/أحمر حسب الحالة

### 15.6 استخراج PDF (`/documents`)

- رفع ملفات PDF للتحليل
- Placeholder — بدون معالجة فعلية حالياً

---

## 16. تدفق البيانات الكامل

```
┌─────────────────────────────────────────────────────┐
│                   المستخدم                           │
└─────────────────────┬───────────────────────────────┘
                      │
              اختيار كود البناء
              + إدخال الأبعاد والأسعار
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              AnalyzerTab (نموذج الإدخال)              │
│  zoningCode, landArea, streetWidth, floors,          │
│  landPricePerM2, sellPricePerM2, buildCostPerM2,     │
│  projectDurationMonths, bankPct, unitMix...           │
│                                                     │
│  → setFormFields() → Zustand Store                   │
└─────────────────────┬───────────────────────────────┘
                      │ submit
                      ▼
┌─────────────────────────────────────────────────────┐
│              runFeasibility()                         │
│                                                     │
│  calculateAreas()      → AreaResult                 │
│  calculateCosts()      → CostResult                 │
│  calculateRevenue()    → number                     │
│  buildCashFlowTimeline() → number[]                  │
│  irrFromCashFlows()    → IRR% (Newton-Raphson)       │
│  runComplianceChecks() → ComplianceResult            │
│  calculateRLV()        → {maxLandPerM2}              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│          FeasibilityResult → Zustand Store            │
│          (projectResults[projectId])                  │
└──────┬──────────┬──────────┬───────────┬────────────┘
       │          │          │           │
       ▼          ▼          ▼           ▼
  ResultsTab  Sensitivity  HBU      Stress/Timing
  (عرض)       (تحليل)     (مقارنة)  (سيناريوهات)
       │
       │ (بعد تكميل بيانات الاستشاري)
       ▼
┌─────────────────────────────────────────────────────┐
│         AdvisoryReportPage (التقرير الكامل)           │
│                                                     │
│  calculateReadiness()   → GateResult                │
│  calculateConfidence()  → ConfidenceBreakdown        │
│  calculateLocationScore() → LocationScoreResult      │
│  generateExecutiveSummary() → string                 │
│  distributionEngine()   → DistributionResult         │
│                                                     │
│  → 10 أقسام → طباعة PDF                              │
└─────────────────────────────────────────────────────┘
```

---

## 17. أنواع البيانات الرئيسية

### FeasibilityResult

```typescript
interface FeasibilityResult {
  areas: {
    landArea: number;
    grossBuildArea: number;
    sellableArea: number;
    aboveGroundGFA: number;
    aboveGroundSellable: number;
    basementGFA: number;
    parkingSupplySpots: number;
    parkingDemandSpots: number;
    parkingDeficit: number;
    groundCoverageRatio: number;
  };
  costs: {
    landCost: number;
    aboveGroundBuildCost: number;
    basementTotalCost: number;
    softCosts: number;
    contingency: number;
    marketingCost: number;
    financingCost: number;
    totalCost: number;
  };
  financials: {
    revenue: number;
    net: number;
    margin: number;        // %
    roi: number;           // %
    irr: number;           // %
    irrMethod: 'exact' | 'approximate';
    npv: number;
    paybackMonths: number;
  };
  unitMix: UnitMixSummary | null;
  compliance: ComplianceResult;
  rlv: { maxLandPerM2: number; maxLandBudget: number };
  summary: { isBuy: boolean; decision: string; reasons: string[] };
  cashFlow: number[];        // تدفق نقدي شهري
  inputWarnings: string[];
}
```

### LocationScoreResult

```typescript
interface LocationScoreResult {
  totalScore:  number;                    // 0–100
  grade:       'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'ضعيف';
  breakdown: {
    zoningFit:      number;
    accessibility:  number;
    amenities:      number;
    infrastructure: number;
  };
  positives:  string[];
  cautions:   string[];
  narrative:  string;
  dataSource: 'derived' | 'api';
  featureScore?:     number;
  featureBreakdown?: { key: string; label: string; value: number; weight: number }[];
}
```

### ConfidenceBreakdown

```typescript
interface ConfidenceBreakdown {
  coverage:    number;  // 0–1
  quality:     number;  // 0–1
  consistency: number;  // 0–1
  total:       number;  // 0–100
  grade:       'investment' | 'conditional' | 'indicative';
  reasons:     { type: 'positive' | 'negative' | 'neutral'; text: string }[];
}
```

### ReportBuilderData

```typescript
interface ReportBuilderData {
  projectBrief:       string;
  projectAdvantages:  string;
  pricingAnalysis:    string;
  executiveSummary:   string;
  unitTypes:          ReportUnitRow[];
  distributionConfig: ProfitDistributionConfig | null;
  target:             'internal' | 'bank' | 'individual' | 'institutional' | null;
  targetName:         string;
  investorOwnCapital: number;
  lastGeneratedAt?:   string;
}
```

---

## 18. قيود وملاحظات تصميمية

### قواعد ثابتة (لا تُكسر)

| القاعدة | السبب |
|---------|-------|
| البدروم لا يُباع أبداً | قانون البناء السعودي |
| RETT = 5% ثابت | نظام ضريبة التصرفات العقارية |
| وحدة <180م² → 1 موقف، ≥180م² → 2 | الكود السعودي |
| لا يُستخدم IRR التقريبي في التقارير | دقة النتائج |
| التقرير الاستثماري يشترط readiness = 100% | حماية المستخدم |
| التقرير الاسترشادي للداخلي فقط | إفصاح قانوني |

### حالات الـ Fallback

كل صفحة تحاول API أولاً، ثم تشغّل المحرك المحلي عند الفشل مع إظهار تحذير للمستخدم.

### البيانات المحايدة (لا مصدر لها بعد)

| البيانات | القيمة الافتراضية | الحالة |
|---------|-----------------|--------|
| `amenitiesScore` | 62/100 | hardcoded |
| `locationScore` | 65/100 | hardcoded |
| `hasMosqueNearby` | 0.5 (محايد) | لا حقل إدخال بعد |
| `hasSchoolNearby` | 0.5 (محايد) | لا حقل إدخال بعد |
| `infrastructureScore` | 0.7 | لا حقل إدخال بعد |

### ERP Integration

ملف `src/lib/integrations/erpPlaceholder.ts` — Placeholder جاهز للربط بـ ERPNext:
```typescript
fetchERPData(projectId)  → null حالياً
isERPConnected()         → false دائماً
```

### حدود الـ Snapshots

```
أقصى 20 snapshot لكل مشروع
يُحفظ عند: توليد التقرير الاستشاري
يُستخدم لـ: معايرة التنبؤات مستقبلاً
```

---

## ملاحظة ختامية

النظام مصمم بمبدأ **"offline-first"** — كل الحسابات تعمل محلياً بدون اتصال بالشبكة. ربط الـ API اختياري ولا يكسر أي وظيفة عند غيابه. جميع المحركات مكتوبة بـ TypeScript نقي بدون dependencies خارجية.

---

*آخر تحديث: 2026 — بصيرة v4 Two-Tier Reports*
