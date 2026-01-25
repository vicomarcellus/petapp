import { db } from '../db';
import { User } from '../types';

export const authService = {
  // Получить текущего пользователя
  getCurrentUser(): User | null {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  },

  // Сохранить пользователя
  async saveUser(user: User): Promise<void> {
    await db.users.put(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  },

  // Выйти
  logout(): void {
    localStorage.removeItem('currentUser');
  },

  // Проверить авторизацию
  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },

  // Получить ID пользователя
  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
  },
};
