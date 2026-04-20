# إعادة الهيكلة — تقرير الإنجاز

## نتيجة البناء
```
✓ tsc -b  — صفر أخطاء TypeScript
✓ vite build — 790 modules transformed
✓ built in 4.02s
```

---

## الملفات المنقولة (moved)

| الملف القديم | الملف الجديد |
|---|---|
| `pages/project/ProjectPage.tsx` | `pages/projects/ProjectPage.tsx` |
| `pages/project/projectTabs.ts` | `pages/analyzer/projectTabs.ts` |
| `pages/project/tabs/AnalyzerTab.tsx` | `pages/analyzer/tabs/AnalyzerTab.tsx` |
| `pages/project/tabs/DimensionsTab.tsx` | `pages/analyzer/tabs/DimensionsTab.tsx` |
| `pages/project/tabs/RLVTab.tsx` | `pages/analyzer/tabs/RlvTab.tsx` |
| `pages/project/tabs/DryPowderTab.tsx` | `pages/analyzer/tabs/DryPowderTab.tsx` |
| `pages/project/tabs/ResultsTab.tsx` | `pages/analyzer/tabs/ResultsTab.tsx` |
| `pages/project/tabs/AuctionTab.tsx` | `pages/tools/AuctionPage.tsx` |
| `pages/project/tabs/HBUTab.tsx` | `pages/tools/HbuPage.tsx` |
| `pages/project/tabs/SensitivityTab.tsx` | `pages/tools/SensitivityPage.tsx` |
| `pages/project/tabs/TimeSensitivityTab.tsx` | `pages/tools/TimeSensitivityPage.tsx` |
| `pages/project/tabs/StressTestTab.tsx` | `pages/tools/StressTestPage.tsx` |
| `pages/documents/DocumentsPage.tsx` | `pages/tools/PdfExtractPage.tsx` |
| `pages/reports/MainReport.tsx` | `pages/reports/templates/MainReport.tsx` |
| `pages/reports/FeasibilityReport.tsx` | `pages/reports/templates/FeasibilityReport.tsx` |
| `pages/reports/BankReport.tsx` | `pages/reports/templates/BankReport.tsx` |
| `pages/reports/InternalReport.tsx` | `pages/reports/templates/InternalReport.tsx` |
| `pages/reports/ShareholdersAReport.tsx` | `pages/reports/templates/ShareholderInstitutionalReport.tsx` |
| `pages/reports/ShareholdersBReport.tsx` | `pages/reports/templates/ShareholderIndividualReport.tsx` |

---

## الملفات المقسّمة (split)

### store/index.ts → 4 ملفات
- `store/types.ts` — واجهات User, ProjectInput, Project
- `store/authStore.ts` — useAuthStore
- `store/projectStore.ts` — useProjectsStore
- `store/uiStore.ts` — useUIStore
- `store/analysisStore.ts` — stub (التحليل لا يزال في AnalysisContext)
- `store/index.ts` — re-exports جميع exports السابقة (backward-compatible)

### api/index.ts → 5 ملفات
- `api/types.ts` — واجهات API
- `api/client.ts` — axios instance + interceptors
- `api/authApi.ts` — authAPI
- `api/projectsApi.ts` — projectsAPI + documentsAPI
- `api/analysisApi.ts` — analysisAPI + aiAPI
- `api/marketApi.ts` — marketAPI (جديد)
- `api/index.ts` — re-exports جميع exports السابقة (backward-compatible)

---

## الملفات الجديدة المنشأة

### engines/ (منطق الأعمال)
```
engines/regulation/types.ts
engines/regulation/buildingCodes.ts
engines/regulation/regulationEngine.ts
engines/regulation/index.ts
engines/feasibility/types.ts
engines/feasibility/areaCalculator.ts
engines/feasibility/costCalculator.ts
engines/feasibility/revenueCalculator.ts
engines/feasibility/financialEngine.ts
engines/feasibility/index.ts
engines/scenarios/types.ts
engines/scenarios/sensitivityEngine.ts
engines/scenarios/timingEngine.ts
engines/scenarios/hbuEngine.ts
engines/scenarios/auctionEngine.ts
engines/scenarios/index.ts
engines/reports/types.ts
engines/reports/reportDataBuilder.ts
engines/reports/index.ts
```

### hooks/
```
hooks/useAnalysis.ts     ← re-export من AnalysisContext
hooks/useProject.ts
hooks/useRegulation.ts
hooks/useToast.ts
```

### utils/
```
utils/format.ts          ← fmt, fmtM, pct, sar, fmtDate, today
utils/constants.ts       ← HURDLE_RATE, DRAWDOWN_STAGES, إلخ
utils/validation.ts      ← isPositive, parseNum, إلخ
utils/pdfExport.ts       ← exportToPdf, A4_PRINT_CSS
```

### styles/
```
styles/globals.css       ← CSS variables
styles/print.css         ← @media print للتقارير
styles/components.css    ← styles مشتركة
```

### components/ui/ (مكونات أساسية)
```
components/ui/Button.tsx
components/ui/Card.tsx
components/ui/Input.tsx
components/ui/Select.tsx
components/ui/Badge.tsx
components/ui/Modal.tsx
components/ui/Table.tsx
components/ui/index.ts
```

### components/shared/ (مكونات مشتركة)
```
components/shared/KpiCard.tsx
components/shared/MetricRow.tsx
components/shared/BnmBox.tsx
components/shared/RegulationSummary.tsx
components/shared/index.ts
```

### components/layout/
```
components/layout/index.ts   ← re-exports
```

### pages — stubs جديدة
```
pages/analyzer/tabs/BasicTab.tsx       ← alias → AnalyzerTab
pages/analyzer/tabs/CostsTab.tsx       ← alias → RlvTab
pages/analyzer/tabs/FinancingTab.tsx   ← alias → DryPowderTab
pages/tools/ChatPage.tsx
pages/market/MarketPage.tsx
pages/admin/UsersPage.tsx
pages/admin/RegulationCodesPage.tsx
pages/reports/shareholders/InputPage.tsx
pages/reports/shareholders/ReportView.tsx
```

---

## الملفات المحذوفة (deleted)

| الملف | السبب |
|---|---|
| `pages/project/ProjectPage.tsx` | نُقل |
| `pages/project/projectTabs.ts` | نُقل |
| `pages/project/tabs/*.tsx` (10 ملفات) | نُقلت |
| `pages/project/AnalyzerTab.tsx` | نسخة قديمة (legacy) |
| `pages/project/DryPowderTab.tsx` | نسخة قديمة (legacy) |
| `pages/project/RLVTab.tsx` | نسخة قديمة (legacy) |
| `pages/project/StressTestTab.tsx` | نسخة قديمة (legacy) |
| `pages/reports/*.tsx` (6 ملفات) | نُقلت إلى templates/ |
| `pages/documents/DocumentsPage.tsx` | نُقل |

---

## الإمبورت المحدّثة

| الملف | التغيير |
|---|---|
| `App.tsx` | ProjectPage → pages/projects, DocumentsPage → pages/tools/PdfExtractPage |
| `components/layout/Sidebar.tsx` | PROJECT_TABS → pages/analyzer/projectTabs |
| `pages/reports/ReportsPage.tsx` | imports → ./templates/... |
| `pages/analyzer/tabs/ResultsTab.tsx` | tool tabs → ../../tools/... |
| `pages/tools/*.tsx` | `../../../` → `../../` لعمق صحيح |
| `pages/reports/templates/*.tsx` | `../../` → `../../../` لعمق صحيح |
