import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CITIES, DEFAULT_DISTRICTS } from '../lib/masterData';
import type { City, District } from '../lib/masterData';

// ── State ────────────────────────────────────────────────────

interface MasterDataState {
  cities:    City[];
  districts: District[];
}

// ── Actions ──────────────────────────────────────────────────

interface MasterDataActions {
  /* Cities */
  addCity:    (city: City) => void;
  updateCity: (id: string, updates: Partial<City>) => void;
  deleteCity: (id: string) => void;

  /* Districts */
  addDistrict:    (district: District) => void;
  updateDistrict: (id: string, updates: Partial<District>) => void;
  deleteDistrict: (id: string) => void;

  /* Helpers */
  getDistrictsByCity: (cityId: string) => District[];
  resetToDefaults:    () => void;
}

export type MasterDataStore = MasterDataState & MasterDataActions;

// ── Store ────────────────────────────────────────────────────

export const useMasterDataStore = create<MasterDataStore>()(
  persist(
    (set, get) => ({
      cities:    DEFAULT_CITIES,
      districts: DEFAULT_DISTRICTS,

      /* ── City actions ── */
      addCity: (city) =>
        set(s => ({ cities: [...s.cities, city] })),

      updateCity: (id, updates) =>
        set(s => ({
          cities: s.cities.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

      deleteCity: (id) =>
        set(s => ({
          cities:    s.cities.filter(c => c.id !== id),
          districts: s.districts.filter(d => d.cityId !== id),
        })),

      /* ── District actions ── */
      addDistrict: (district) =>
        set(s => ({ districts: [...s.districts, district] })),

      updateDistrict: (id, updates) =>
        set(s => ({
          districts: s.districts.map(d => d.id === id ? { ...d, ...updates } : d),
        })),

      deleteDistrict: (id) =>
        set(s => ({ districts: s.districts.filter(d => d.id !== id) })),

      /* ── Helpers ── */
      getDistrictsByCity: (cityId) =>
        get().districts.filter(d => d.cityId === cityId),

      resetToDefaults: () =>
        set({ cities: DEFAULT_CITIES, districts: DEFAULT_DISTRICTS }),
    }),
    {
      name: 'basira-master-data-v1',
      version: 1,
    },
  ),
);
