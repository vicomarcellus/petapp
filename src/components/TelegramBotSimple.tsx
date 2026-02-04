import { useStore } from '../store';
import { ExternalLink } from 'lucide-react';

export default function TelegramBotSimple() {
  const { currentUser } = useStore();

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
              <p className="text-gray-800 font-medium mb-2">Отправьте боту свой email</p>
              <div className="bg-white border-2 border-blue-300 rounded-2xl p-4">
                <p className="text-sm text-gray-600 mb-2">Ваш email:</p>
                <code className="text-lg font-mono font-bold text-blue-600 block mb-3">
                  {currentUser?.username || 'Не авторизован'}
                </code>
                <p className="text-xs text-gray-500">
                  Отправьте боту команду:
                </p>
                <code className="text-sm bg-gray-100 px-3 py-2 rounded mt-1 inline-block font-mono">
                  /login {currentUser?.username}
                </code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-gray-800 font-medium">Готово!</p>
              <p className="text-sm text-gray-600 mt-1">
                Бот автоматически привяжет ваш аккаунт
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
      </div>
    </div>
  );
}
