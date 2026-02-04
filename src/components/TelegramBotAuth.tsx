import { useState } from 'react';
import { LoginButton } from '@telegram-auth/react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { ExternalLink, Copy, Check } from 'lucide-react';

export default function TelegramBotAuth() {
  const { currentUser } = useStore();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleTelegramAuth = async (data: any) => {
    console.log('Telegram auth data:', data);
    
    if (!currentUser) {
      alert('Сначала авторизуйтесь в веб-приложении');
      return;
    }

    try {
      // Сохранить связь Telegram ID с User ID
      const { error } = await supabase
        .from('telegram_users')
        .upsert({
          telegram_id: data.id,
          supabase_user_id: currentUser.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'telegram_id'
        });

      if (error) {
        console.error('Error linking account:', error);
        alert('Ошибка при привязке аккаунта');
        return;
      }

      alert('✅ Аккаунт успешно привязан!\n\nТеперь можете использовать бота в Telegram.');
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка при привязке аккаунта');
    }
  };

  const generateLinkCode = async () => {
    if (!currentUser) {
      alert('Сначала авторизуйтесь в веб-приложении');
      return;
    }

    setGenerating(true);
    try {
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
        alert('Ошибка при генерации кода');
        return;
      }

      setLinkCode(code);
    } catch (err) {
      console.error('Error:', err);
      alert('Ошибка при генерации кода');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-bold text-blue-900 mb-4">
          Подключение бота
        </h3>
        
        {/* Метод 1: Telegram Login Widget */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-700 mb-3">Метод 1: Быстрая авторизация</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="text-gray-800 font-medium mb-2">Нажмите кнопку для авторизации</p>
                <div className="bg-white border-2 border-blue-300 rounded-2xl p-4 inline-block">
                  <LoginButton
                    botUsername="petappkent_bot"
                    onAuthCallback={handleTelegramAuth}
                    buttonSize="large"
                    cornerRadius={10}
                    showAvatar={true}
                    lang="ru"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Работает только на опубликованном сайте
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Разделитель */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-blue-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-blue-50 text-gray-600 font-medium">или</span>
          </div>
        </div>

        {/* Метод 2: Код привязки */}
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">Метод 2: Привязка по коду</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium mb-2">Сгенерируйте код</p>
                {!linkCode ? (
                  <button
                    onClick={generateLinkCode}
                    disabled={generating}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {generating ? 'Генерация...' : 'Сгенерировать код'}
                  </button>
                ) : (
                  <div className="bg-white border-2 border-green-300 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <code className="text-2xl font-bold text-green-700 tracking-wider">
                        {linkCode}
                      </code>
                      <button
                        onClick={copyCode}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title="Скопировать"
                      >
                        {copied ? (
                          <Check size={20} className="text-green-600" />
                        ) : (
                          <Copy size={20} className="text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Код действует 10 минут
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="text-gray-800 font-medium">Откройте бота в Telegram</p>
                <a
                  href="https://t.me/petappkent_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 font-medium"
                >
                  @petappkent_bot
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="text-gray-800 font-medium">Отправьте команду</p>
                <code className="text-sm bg-gray-100 px-3 py-1 rounded-lg mt-1 inline-block">
                  /link {linkCode || 'КОД'}
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="text-gray-800 font-medium">Готово!</p>
                <p className="text-sm text-gray-600 mt-1">
                  Используйте команды бота для управления записями
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>💡 Совет:</strong> Метод 2 (привязка по коду) работает всегда и везде. 
            Метод 1 (быстрая авторизация) работает только на опубликованном сайте.
          </p>
        </div>
      </div>
    </div>
  );
}
