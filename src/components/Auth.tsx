import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { LogOut, PawPrint } from 'lucide-react';
import { AlertModal } from './Modal';
import { Input } from './ui/Input';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[24px] mb-4 shadow-sm">
            <PawPrint className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2">
            Дневник здоровья
          </h1>
          <p className="text-gray-500">
            {isLogin ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              label="Имя"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              disabled={loading}
            />
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={loading}
          />

          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3.5 px-4 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full text-gray-500 hover:text-black text-sm font-medium transition-colors"
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
