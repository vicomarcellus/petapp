import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { LogOut, PawPrint } from 'lucide-react';
import { AlertModal } from './Modal';

export function Auth() {
  const { currentUser, setCurrentUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          firstName: session.user.user_metadata?.firstName || session.user.email?.split('@')[0] || 'User',
          username: session.user.email,
          authDate: new Date(session.user.created_at).getTime(),
        });
      }
    });

    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          firstName: session.user.user_metadata?.firstName || session.user.email?.split('@')[0] || 'User',
          username: session.user.email,
          authDate: new Date(session.user.created_at).getTime(),
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setCurrentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Заполните все поля');
      setLoading(false);
      return;
    }

    if (!isLogin && !name) {
      setError('Введите имя');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Вход
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Неверный email или пароль. Если вы новый пользователь - зарегистрируйтесь.');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Email не подтвержден. Проверьте почту.');
          } else {
            setError('Ошибка входа: ' + signInError.message);
          }
          return;
        }
      } else {
        // Регистрация
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              firstName: name,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        // Показываем сообщение об успешной регистрации
        setError('');
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError('Ошибка: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  if (currentUser) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700">
          {currentUser.firstName}
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
                disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            disabled={loading}
            className="w-full text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </button>
        </form>
      </div>

      <AlertModal
        isOpen={showSuccessModal}
        title="Регистрация успешна!"
        message="Проверьте email для подтверждения (если включено)."
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
