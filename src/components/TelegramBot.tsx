import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function TelegramBot() {
  const { currentUser } = useStore();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Временно отключаем проверку статуса из-за проблем с API
    // Просто показываем форму генерации кода
    setLoading(false);
  }, [currentUser]);

  const generateCode = async () => {
    if (!currentUser) return;

    setGenerating(true);
    try {
      // Генерируем код
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

      const { error } = await supabase
        .from('telegram_link_codes')
        .insert({
          code,
          supabase_user_id: currentUser.id,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.error('Error generating code:', error);
        alert(`Ошибка при генерации кода: ${error.message}\n\nПроверьте что SQL выполнен в Supabase.`);
        throw error;
      }

      setLinkCode(code);
    } catch (err) {
      console.error('Error generating code:', err);
      if (err instanceof Error) {
        alert(`Ошибка: ${err.message}`);
      } else {
        alert('Ошибка при генерации кода. Проверьте консоль браузера (F12).');
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(`/link ${linkCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const unlinkBot = async () => {
    if (!currentUser || !confirm('Отвязать Telegram бота?')) return;

    try {
      await supabase
        .from('telegram_users')
        .delete()
        .eq('supabase_user_id', currentUser.id);

      setIsLinked(false);
      setTelegramId(null);
      setLinkCode(null);
    } catch (err) {
      console.error('Error unlinking bot:', err);
      alert('Ошибка при отвязке');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {isLinked ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900">Бот подключён</h3>
              <p className="text-green-700">Telegram ID: {telegramId}</p>
            </div>
          </div>
          <p className="text-green-800 mb-4">
            Теперь вы можете управлять записями через Telegram бота.
          </p>
          <button
            onClick={unlinkBot}
            className="px-6 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all"
          >
            Отвязать бота
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-bold text-blue-900 mb-4">
            Подключение бота
          </h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-gray-800 font-medium">Найдите бота в Telegram</p>
                <a
                  href="https://t.me/petappkent_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  @petappkent_bot
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium mb-2">Получите код привязки</p>
                {!linkCode ? (
                  <button
                    onClick={generateCode}
                    disabled={generating}
                    className="px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    {generating ? 'Генерация...' : 'Сгенерировать код'}
                  </button>
                ) : (
                  <div className="bg-white border-2 border-blue-300 rounded-2xl p-4">
                    <p className="text-sm text-gray-600 mb-2">Ваш код (действителен 10 минут):</p>
                    <div className="flex items-center gap-2">
                      <code className="text-2xl font-mono font-bold text-blue-600 flex-1">
                        {linkCode}
                      </code>
                      <button
                        onClick={copyCode}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                        title="Скопировать команду"
                      >
                        {copied ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Copy size={20} className="text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-gray-800 font-medium">Отправьте команду боту</p>
                <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                  /link {linkCode || 'КОД'}
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4">Возможности бота</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Быстрое добавление записей (состояние, симптом, лекарство, питание)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Просмотр записей за сегодня</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Напоминания о запланированных событиях</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            <span>Отправка фото (автоматически прикрепляется к записи)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
