import { create } from 'zustand';

interface UIState {
  sidebarProjectsOpen: boolean;
  toggleSidebarProjects: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarProjectsOpen: false,
  toggleSidebarProjects: () =>
    set((s) => ({ sidebarProjectsOpen: !s.sidebarProjectsOpen })),
}));
