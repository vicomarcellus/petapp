import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Plus, Trash2, Calendar, Clock, Pill } from 'lucide-react';
import { Header } from './Header';
import {
  createSchedule,
  getSchedules,
  deleteSchedule,
  sendTestReminder,
  type MedicationSchedule,
} from '../services/medicationSchedule';

export const MedicationSchedules = () => {
  const { currentPetId } = useStore();
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Форма
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('09:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysCount, setDaysCount] = useState(3);

  const currentPet = useLiveQuery(
    async () => {
      if (!currentPetId) return null;
      return await db.pets.get(currentPetId);
    },
    [currentPetId]
  );

  const chatId = localStorage.getItem('telegram_chat_id');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    const result = await getSchedules();
    if (result.success && result.schedules) {
      setSchedules(result.schedules);
    }
    setLoading(false);
  };

  const handleCreateSchedule = async () => {
    if (!currentPet || !medicationName || !dosage || !time || !startDate || !daysCount) {
      setStatus('Заполните все поля');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    if (!chatId) {
      setStatus('Настройте Telegram в разделе Настройки');
      setTimeout(() => setStatus(null), 3000);
      return;
    }

    setStatus('Создание расписания...');

    const result = await createSchedule(
      currentPet.id!,
      currentPet.name,
      medicationName,
      dosage,
      time,
      startDate,
      daysCount
    );

    if (result.success) {
      setStatus('Расписание создано!');
      setShowForm(false);
      setMedicationName('');
      setDosage('');
      setTime('09:00');
      setStartDate(new Date().toISOString().split('T')[0]);
      setDaysCount(3);
      loadSchedules();
    } else {
      setStatus(result.error || 'Ошибка создания');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Удалить расписание?')) return;

    setStatus('Удаление...');
    const result = await deleteSchedule(scheduleId);

    if (result.success) {
      setStatus('Расписание удалено');
      loadSchedules();
    } else {
      setStatus(result.error || 'Ошибка удаления');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const handleTestReminder = async () => {
    if (!currentPet) return;

    setStatus('Отправка тестового уведомления...');
    const result = await sendTestReminder(
      currentPet.name,
      'Тестовое лекарство',
      '1 таблетка',
      new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    );

    if (result.success) {
      setStatus('Уведомление отправлено!');
    } else {
      setStatus(result.error || 'Ошибка отправки');
    }

    setTimeout(() => setStatus(null), 3000);
  };

  const activeSchedules = schedules.filter(s => s.isCurrent && s.isActive);
  const pastSchedules = schedules.filter(s => !s.isCurrent || !s.isActive);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        {status && (
          <div className="mb-3 p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
            {status}
          </div>
        )}

        {!chatId && (
          <div className="mb-3 p-3 bg-yellow-50 rounded-xl text-sm text-yellow-800">
            ⚠️ Настройте Telegram в разделе Настройки для получения уведомлений
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-sm"
          >
            <Plus size={16} />
            Новое расписание
          </button>
          {chatId && (
            <button
              onClick={handleTestReminder}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full hover:bg-gray-50 transition-all font-medium text-sm border border-gray-200"
            >
              Тест уведомления
            </button>
          )}
        </div>

        {/* Форма создания */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-4">
            <h3 className="font-semibold text-black mb-3">Новое расписание</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Название лекарства"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black placeholder-gray-400 outline-none text-sm"
              />
              <input
                type="text"
                placeholder="Дозировка (например: 0.3 мл)"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black placeholder-gray-400 outline-none text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 px-2">Время</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 px-2">Начало</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 px-2">Количество дней</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-50 rounded-full focus:bg-white focus:ring-2 focus:ring-black transition-all text-black outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSchedule}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all font-medium text-sm"
                >
                  Создать
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-all font-medium text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Активные расписания */}
        {activeSchedules.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Активные расписания
            </h2>
            <div className="space-y-2">
              {activeSchedules.map((schedule) => (
                <div key={schedule.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill size={16} className="text-gray-400" />
                        <span className="font-semibold text-black">{schedule.medicationName}</span>
                      </div>
                      <div className="text-sm text-gray-600">{schedule.dosage}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id!)}
                      className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {schedule.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {schedule.startDate} — {schedule.endDate}
                    </div>
                    <div className="text-gray-400">
                      {schedule.petName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Прошедшие расписания */}
        {pastSchedules.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Завершенные
            </h2>
            <div className="space-y-2">
              {pastSchedules.map((schedule) => (
                <div key={schedule.id} className="bg-white rounded-2xl p-4 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-black text-sm">{schedule.medicationName}</div>
                      <div className="text-xs text-gray-500">
                        {schedule.startDate} — {schedule.endDate} • {schedule.time}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id!)}
                      className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && schedules.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Pill size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Нет расписаний</p>
            <p className="text-xs mt-1">Создайте первое расписание лекарств</p>
          </div>
        )}
      </div>
    </div>
  );
};
