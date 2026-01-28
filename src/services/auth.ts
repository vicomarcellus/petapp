// DEPRECATED - больше не используется, аутентификация через Supabase
// Оставлено для совместимости

import { User } from '../types';

export const authService = {
  getCurrentUser(): User | null {
    return null;
  },

  async saveUser(user: User): Promise<void> {
    // Не используется
  },

  logout(): void {
    localStorage.removeItem('currentUser');
  },

  isAuthenticated(): boolean {
    return false;
  },

  getUserId(): string | null {
    return null;
  },
};
