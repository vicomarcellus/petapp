import { LoginButton } from '@telegram-auth/react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { ExternalLink } from 'lucide-react';

export default function TelegramBotAuth() {
  const { currentUser } = useStore();

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

  return (
    <div className="p-6">
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
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-gray-800 font-medium">Откройте бота в Telegram</p>
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
              3
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

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800">
            <strong>Важно:</strong> Кнопка авторизации работает только на опубликованном сайте (не на localhost).
            Для тестирования используйте команду <code className="bg-yellow-100 px-1 rounded">/start</code> в боте.
          </p>
        </div>
      </div>
    </div>
  );
}
