import { create } from 'zustand';
import { DayEntry, User } from './types';

interface AppState {
  currentUser: User | null;
  selectedDate: string | null;
  currentYear: number;
  currentMonth: number; // 0-11 (январь-декабрь)
  currentPetId: number | null; // ID текущего выбранного питомца
  view: 'calendar' | 'add' | 'view' | 'edit' | 'log' | 'settings' | 'history' | 'analytics' | 'checklist';
  editingEntry: DayEntry | null;
  setCurrentUser: (user: User | null) => void;
  setSelectedDate: (date: string | null) => void;
  setCurrentYear: (year: number) => void;
  setCurrentMonth: (month: number) => void;
  setCurrentPetId: (petId: number | null) => void;
  setView: (view: 'calendar' | 'add' | 'view' | 'edit' | 'log' | 'settings' | 'history' | 'analytics' | 'checklist') => void;
  setEditingEntry: (entry: DayEntry | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  selectedDate: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  currentPetId: null, // Будет установлен при загрузке
  view: 'calendar',
  editingEntry: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentYear: (year) => set({ currentYear: year }),
  setCurrentMonth: (month) => set({ currentMonth: month }),
  setCurrentPetId: (petId) => set({ currentPetId: petId }),
  setView: (view) => set({ view }),
  setEditingEntry: (entry) => set({ editingEntry: entry }),
}));
