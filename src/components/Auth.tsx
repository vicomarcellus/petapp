import { useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { User } from '../types';
import { LogOut, PawPrint } from 'lucide-react';

// Telegram Login Widget types
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void;
  }
}

export function Auth() {
  const { currentUser, setCurrentUser } = useStore();

  useEffect(() => {
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      return;
    }

    // Callback для Telegram Login Widget
    window.onTelegramAuth = async (telegramUser: any) => {
      const user: User = {
        id: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        authDate: telegramUser.auth_date,
      };

      // Сохраняем пользователя
      await db.users.put(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setCurrentUser(user);
    };

    return () => {
      delete window.onTelegramAuth;
    };
  }, [setCurrentUser]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  };

  if (currentUser) {
    return (
      <div className="flex items-center gap-3">
        {currentUser.photoUrl && (
          <img
            src={currentUser.photoUrl}
            alt={currentUser.firstName}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-gray-700">
          {currentUser.firstName} {currentUser.lastName}
        </span>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-600 hover:text-red-600 transition-colors"
          title="Выйти"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <PawPrint className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Дневник здоровья питомца
          </h1>
          <p className="text-gray-600">
            Войдите через Telegram, чтобы синхронизировать данные между устройствами
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Преимущества входа:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Доступ с любого устройства</li>
              <li>✓ Автоматическая синхронизация</li>
              <li>✓ Безопасное хранение данных</li>
              <li>✓ Без регистрации и паролей</li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <script
              async
              src="https://telegram.org/js/telegram-widget.js?22"
              data-telegram-login="kentpetapp_bot"
              data-size="large"
              data-onauth="onTelegramAuth(user)"
              data-request-access="write"
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Нажимая кнопку входа, вы соглашаетесь с использованием Telegram для авторизации
          </p>
        </div>
      </div>
    </div>
  );
}
