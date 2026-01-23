import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { ArrowLeft, Undo2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { undoLastAction, getActionIcon, getActionColor } from '../services/history';
import { Header } from './Header';

export const ChangeHistory = () => {
  const { setView } = useStore();
  const [undoing, setUndoing] = useState(false);

  const history = useLiveQuery(
    () => db.history.orderBy('timestamp').reverse().limit(100).toArray(),
    []
  );

  const handleBack = () => {
    setView('settings');
  };

  const handleUndo = async () => {
    if (!confirm('Отменить последнее действие?')) return;

    setUndoing(true);
    try {
      const success = await undoLastAction();
      if (success) {
        alert('Действие отменено!');
      } else {
        alert('Нет действий для отмены');
      }
    } catch (error) {
      alert('Ошибка отмены: ' + error);
    } finally {
      setUndoing(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Очистить всю историю изменений? Это действие нельзя отменить!')) return;

    try {
      await db.history.clear();
      alert('История очищена');
    } catch (error) {
      alert('Ошибка очистки: ' + error);
    }
  };

  const groupByDate = (entries: typeof history) => {
    if (!entries) return [];

    const groups = new Map<string, typeof entries>();
    
    entries.forEach(entry => {
      const date = format(entry.timestamp, 'yyyy-MM-dd');
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(entry);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  };

  const dateGroups = groupByDate(history);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-black" />
            </button>
            <h1 className="text-2xl font-bold text-black">
              История изменений
            </h1>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
            title="Очистить историю"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {history && history.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Undo2 size={18} />
              {undoing ? 'Отмена...' : 'Отменить последнее действие'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          {dateGroups.map(({ date, items }) => (
            <div key={date} className="bg-white rounded-2xl p-4">
              <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                {format(new Date(date), 'd MMMM yyyy', { locale: ru })}
              </div>

              <div className="space-y-2">
                {items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                      style={{ backgroundColor: getActionColor(entry.action) }}
                    >
                      {getActionIcon(entry.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {format(entry.timestamp, 'HH:mm:ss')}
                        {entry.source === 'ai' && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!history || history.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <p>История изменений пуста</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
