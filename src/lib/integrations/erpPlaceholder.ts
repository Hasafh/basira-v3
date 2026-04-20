// Placeholder للربط المستقبلي مع ERPNext — لا ربط حقيقي حالياً

export interface ERPProjectData {
  projectId:          string;
  actualCosts?: {
    land:         number;
    construction: number;
    total:        number;
  };
  actualRevenue?:       number;
  completionPercent?:   number;
}

export async function fetchERPData(projectId: string): Promise<ERPProjectData | null> {
  // TODO: ربط ERPNext لاحقاً
  // const response = await fetch(`/api/erp/project/${projectId}`);
  // return response.json();
  console.log(`[ERP Placeholder] Would fetch data for project: ${projectId}`);
  return null;
}

export function isERPConnected(): boolean {
  // TODO: تحقق من الاتصال بـ ERP
  return false;
}
