import { checkRegulation } from '../engines/regulation';

type CheckResult = ReturnType<typeof checkRegulation>;

export function useRegulation(
  zoningCode: string,
  landArea: number,
  floors: number,
  gcr: number,
): CheckResult | null {
  if (!zoningCode || !landArea) return null;
  return checkRegulation({ zoningCode, landArea, floors, gcr });
}
