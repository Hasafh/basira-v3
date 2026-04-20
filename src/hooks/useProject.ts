import { useProjectsStore } from '../store';

export function useProject() {
  const { currentProject, setCurrentProject, clearAnalysis } = useProjectsStore();
  return { currentProject, setCurrentProject, clearAnalysis };
}
