import { useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { User } from '../types';
import { LogOut, PawPrint } from 'lucide-react';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
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

    // Проверяем, запущено ли приложение из Telegram
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const telegramUser = tg.initDataUnsafe.user;
      if (telegramUser) {
        const user: User = {
          id: telegramUser.id,
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name,
          username: telegramUser.username,
          photoUrl: telegramUser.photo_url,
          authDate: Date.now(),
        };

        // Сохраняем пользователя
        db.users.put(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
      }
    }
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
          <p className="text-gray-600 mb-4">
            Откройте приложение через Telegram для автоматического входа
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Как войти:</h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Откройте Telegram</li>
              <li>2. Найдите бота @kentpetapp_bot</li>
              <li>3. Нажмите "Открыть приложение" или отправьте /start</li>
              <li>4. Приложение откроется автоматически!</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Для полноценной работы откройте приложение через Telegram бота
            </p>
          </div>

          <a
            href="https://t.me/kentpetapp_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-full text-center transition-colors"
          >
            Открыть в Telegram
          </a>

          <p className="text-xs text-gray-500 text-center">
            Приложение работает только внутри Telegram
          </p>
        </div>
      </div>
    </div>
  );
}
