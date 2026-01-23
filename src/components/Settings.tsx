import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Edit3, Check, X, Download, Upload, Save, AlertTriangle, Send } from 'lucide-react';
import { SYMPTOM_COLORS } from '../types';
import { downloadBackup, uploadBackup, autoBackup, getLastAutoBackupDate } from '../services/backup';
import { PetManager } from './PetManager';
import { Header } from './Header';
import { sendTestReminder } from '../services/medicationSchedule';

export const Settings = () => {
  const { setView, currentPetId } = useStore();
  const [editingSymptom, setEditingSymptom] = useState<number | null>(null);
  const [editingMed, setEditingMed] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(localStorage.getItem('telegram_chat_id') || '');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const symptomTags = useLiveQuery(() => db.symptomTags.toArray());
  const medicationTags = useLiveQuery(() => db.medicationTags.toArray());
  const lastBackupDate = getLastAutoBackupDate();
  
  const currentPet = useLiveQuery(
    async () => {
      if (!currentPetId) return null;
      return await db.pets.get(currentPetId);
    },
    [currentPetId]
  );

  const handleSaveTelegramChatId = () => {
    localStorage.setItem('telegram_chat_id', telegramChatId);
    setBackupStatus('Telegram chat ID сохранен');
    setTimeout(() => setBackupStatus(null), 3000);
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId) {
      setBackupStatus('Введите chat ID');
      setTimeout(() => setBackupStatus(null), 3000);
      return;
    }

    if (!currentPet) {
      setBackupStatus('Выберите питомца');
      setTimeout(() => setBackupStatus(null), 3000);
      return;
    }

    setTestingTelegram(true);
    setBackupStatus('Отправка тестового уведомления...');

    const result = await sendTestReminder(
      currentPet.name,
      'Тестовое лекарство',
      '1 таблетка',
      new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    );

    setTestingTelegram(false);

    if (result.success) {
      setBackupStatus('✅ Уведомление отправлено! Проверьте Telegram');
    } else {
      setBackupStatus(`❌ Ошибка: ${result.error}`);
    }

    setTimeout(() => setBackupStatus(null), 5000);
  };

  const handleSaveSymptom = async () => {
    if (editingSymptom && editName.trim()) {
      await db.symptomTags.update(editingSymptom, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingSymptom(null);
      setEditName('');
      setEditColor('');
    }
  };

  const handleSaveMed = async () => {
    if (editingMed && editName.trim()) {
      await db.medicationTags.update(editingMed, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingMed(null);
      setEditName('');
      setEditColor('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSymptom(null);
    setEditingMed(null);
    setEditName('');
    setEditColor('');
  };

  const handleDownloadBackup = async () => {
    try {
      setBackupStatus('Создание бэкапа...');
      await downloadBackup();
      await autoBackup(); // Также сохраняем автобэкап
      setBackupStatus('Бэкап успешно скачан!');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (error) {
      setBackupStatus('Ошибка создания бэкапа');
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  const handleUploadBackup = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mode = confirm(
      'Заменить все данные (ОК) или объединить с существующими (Отмена)?'
    ) ? 'replace' : 'merge';

    try {
      setImporting(true);
      setBackupStatus('Импорт данных...');
      await uploadBackup(file, mode);
      await autoBackup(); // Создаем автобэкап после импорта
      setBackupStatus('Данные успешно импортированы!');
      setTimeout(() => {
        setBackupStatus(null);
        window.location.reload(); // Перезагружаем для обновления UI
      }, 2000);
    } catch (error) {
      setBackupStatus(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setTimeout(() => setBackupStatus(null), 5000);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateAutoBackup = async () => {
    try {
      setBackupStatus('Создание автобэкапа...');
      await autoBackup();
      setBackupStatus('Автобэкап создан!');
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (error) {
      setBackupStatus('Ошибка создания автобэкапа');
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  const handleRestoreAutoBackup = async () => {
    if (!confirm('Восстановить данные из автобэкапа? Текущие данные будут заменены.')) {
      return;
    }

    try {
      setBackupStatus('Восстановление из автобэкапа...');
      const { restoreAutoBackup } = await import('../services/backup');
      const success = await restoreAutoBackup();
      
      if (success) {
        setBackupStatus('Данные восстановлены!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setBackupStatus('Автобэкап не найден');
        setTimeout(() => setBackupStatus(null), 3000);
      }
    } catch (error) {
      setBackupStatus('Ошибка восстановления');
      setTimeout(() => setBackupStatus(null), 3000);
    }
  };

  const handleDeleteSymptom = async (id: number) => {
    if (confirm('Удалить этот тег симптома?')) {
      await db.symptomTags.delete(id);
    }
  };

  const handleDeleteMed = async (id: number) => {
    if (confirm('Удалить этот тег лекарства?')) {
      await db.medicationTags.delete(id);
    }
  };

  const handleEditSymptom = (id: number, name: string, color: string) => {
    setEditingSymptom(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleEditMed = (id: number, name: string, color: string) => {
    setEditingMed(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleClearAll = async () => {
    if (confirm('Вы уверены? Это удалит ВСЕ данные: записи, лекарства, симптомы и теги. Это действие нельзя отменить!')) {
      if (confirm('Последнее предупреждение! Все данные будут удалены безвозвратно. Продолжить?')) {
        try {
          await db.dayEntries.clear();
          await db.medicationEntries.clear();
          await db.medications.clear();
          await db.symptomTags.clear();
          await db.medicationTags.clear();
          
          alert('Все данные удалены!');
          window.location.href = '/';
        } catch (error) {
          console.error('Error clearing data:', error);
          alert('Ошибка при удалении данных: ' + error);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="space-y-4">
          {/* Управление питомцами */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Питомцы
            </h2>
            <PetManager />
          </div>

          {/* Telegram уведомления */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Telegram уведомления
            </h2>
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Chat ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Введите ваш Telegram chat ID"
                  className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveTelegramChatId}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-sm"
                >
                  Сохранить
                </button>
                <button
                  onClick={handleTestTelegram}
                  disabled={testingTelegram || !telegramChatId}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full hover:bg-gray-50 transition-all font-medium text-sm border border-gray-200 disabled:opacity-50"
                >
                  <Send size={14} />
                  Тест
                </button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Как получить chat ID:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  <li>Откройте бота @userinfobot в Telegram</li>
                  <li>Отправьте команду /start</li>
                  <li>Скопируйте ваш ID и вставьте выше</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Бэкапы */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Резервные копии
            </h2>
            
            {backupStatus && (
              <div className="mb-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
                {backupStatus}
              </div>
            )}

            {lastBackupDate && (
              <div className="mb-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                Последний автобэкап: {new Date(lastBackupDate).toLocaleString('ru-RU')}
              </div>
            )}

            <div className="bg-white rounded-2xl p-3 space-y-2">
              <button
                onClick={handleDownloadBackup}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium text-sm disabled:opacity-50"
              >
                <Download size={16} />
                Скачать бэкап
              </button>

              <button
                onClick={handleUploadBackup}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black rounded-full hover:bg-gray-50 transition-colors font-medium text-sm border border-gray-200 disabled:opacity-50"
              >
                <Upload size={16} />
                {importing ? 'Импорт...' : 'Загрузить бэкап'}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCreateAutoBackup}
                  disabled={importing}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-medium text-xs disabled:opacity-50"
                >
                  <Save size={14} />
                  Создать
                </button>
                
                <button
                  onClick={handleRestoreAutoBackup}
                  disabled={importing || !lastBackupDate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-medium text-xs disabled:opacity-50"
                >
                  <Upload size={14} />
                  Восстановить
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mt-2 p-3 bg-yellow-50 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800">
                  Регулярно создавайте бэкапы! Автобэкап хранится в браузере.
                </div>
              </div>
            </div>
          </div>

          {/* Теги симптомов */}
          {symptomTags && symptomTags.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
                Теги симптомов
              </h2>
              <div className="bg-white rounded-2xl p-3 space-y-1.5">
                {symptomTags.map((tag) => (
                  <div key={tag.id}>
                    {editingSymptom === tag.id ? (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                          placeholder="Название"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {SYMPTOM_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`w-7 h-7 rounded-full transition-all ${
                                editColor === color ? 'ring-2 ring-black scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveSymptom}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            <Check size={14} />
                            Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <div className="flex-1 font-medium text-sm text-black">
                          {tag.name}
                        </div>
                        <button
                          onClick={() => handleEditSymptom(tag.id!, tag.name, tag.color)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSymptom(tag.id!)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Теги лекарств */}
          {medicationTags && medicationTags.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
                Теги лекарств
              </h2>
              <div className="bg-white rounded-2xl p-3 space-y-1.5">
                {medicationTags.map((tag) => (
                  <div key={tag.id}>
                    {editingMed === tag.id ? (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                          placeholder="Название"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {SYMPTOM_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditColor(color)}
                              className={`w-7 h-7 rounded-full transition-all ${
                                editColor === color ? 'ring-2 ring-black scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveMed}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            <Check size={14} />
                            Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <div className="flex-1 font-medium text-sm text-black">
                          {tag.name}
                        </div>
                        <button
                          onClick={() => handleEditMed(tag.id!, tag.name, tag.color)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMed(tag.id!)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Расширенные функции */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Дополнительно
            </h2>
            <div className="bg-white rounded-2xl p-3">
              <button
                onClick={() => setView('history')}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                История изменений
              </button>
            </div>
          </div>

          {/* Опасная зона */}
          <div>
            <h2 className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wide px-1">
              Опасная зона
            </h2>
            <div className="bg-white rounded-2xl p-3 border border-red-200">
              <p className="text-xs text-gray-600 mb-2">
                Удалить все данные безвозвратно
              </p>
              <button
                onClick={handleClearAll}
                className="w-full px-4 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium text-sm"
              >
                Удалить все данные
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
