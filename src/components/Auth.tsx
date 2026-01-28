import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { User } from '../types';
import { LogOut, PawPrint } from 'lucide-react';

export function Auth() {
  const { currentUser, setCurrentUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Проверяем сохраненного пользователя
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
    }
  }, [setCurrentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    if (!isLogin && !name) {
      setError('Введите имя');
      return;
    }

    try {
      if (isLogin) {
        // Вход - используем индекс вместо загрузки всех пользователей
        const user = await db.users.get(email);
        
        if (!user) {
          setError('Пользователь не найден');
          return;
        }

        // Сохраняем пользователя
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
      } else {
        // Регистрация - проверяем существование через get
        const exists = await db.users.get(email);
        
        if (exists) {
          setError('Email уже используется');
          return;
        }

        const user: User = {
          id: Date.now(),
          firstName: name,
          username: email,
          authDate: Date.now(),
        };

        await db.users.put(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setCurrentUser(user);
      }
    } catch (err) {
      setError('Ошибка: ' + (err as Error).message);
    }
  };

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
            {isLogin ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Ваше имя"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="w-full text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </form>
      </div>
    </div>
  );
}
