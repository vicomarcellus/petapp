import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Activity, AlertCircle, Pill, Utensils, ChevronRight } from 'lucide-react';
import { STATE_COLORS } from '../types';
import type { StateEntry, MedicationEntry, SymptomEntry, FeedingEntry } from '../types';

interface DaySummary {
  date: string;
  stateEntries: StateEntry[];
  symptomEntries: SymptomEntry[];
  medicationEntries: MedicationEntry[];
  feedingEntries: FeedingEntry[];
  avgScore?: number;
  aiSummary?: string;
}

export const ActivityLog = () => {
  const { currentUser, currentPetId, setSelectedDate, setView } = useStore();
  const [daySummaries, setDaySummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadLog();
    }
  }, [currentUser, currentPetId]);

  const loadLog = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const [stateRes, medRes, symptomRes, feedRes] = await Promise.all([
        supabase.from('state_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('date', { ascending: false }),
        supabase.from('medication_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('date', { ascending: false }),
        supabase.from('symptom_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('date', { ascending: false }),
        supabase.from('feeding_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('date', { ascending: false })
      ]);

      // Группируем по дням
      const daysMap = new Map<string, DaySummary>();

      (stateRes.data || []).forEach(entry => {
        if (!daysMap.has(entry.date)) {
          daysMap.set(entry.date, { date: entry.date, stateEntries: [], symptomEntries: [], medicationEntries: [], feedingEntries: [] });
        }
        daysMap.get(entry.date)!.stateEntries.push(entry);
      });

      (symptomRes.data || []).forEach(entry => {
        if (!daysMap.has(entry.date)) {
          daysMap.set(entry.date, { date: entry.date, stateEntries: [], symptomEntries: [], medicationEntries: [], feedingEntries: [] });
        }
        daysMap.get(entry.date)!.symptomEntries.push(entry);
      });

      (medRes.data || []).forEach(entry => {
        if (!daysMap.has(entry.date)) {
          daysMap.set(entry.date, { date: entry.date, stateEntries: [], symptomEntries: [], medicationEntries: [], feedingEntries: [] });
        }
        daysMap.get(entry.date)!.medicationEntries.push(entry);
      });

      (feedRes.data || []).forEach(entry => {
        if (!daysMap.has(entry.date)) {
          daysMap.set(entry.date, { date: entry.date, stateEntries: [], symptomEntries: [], medicationEntries: [], feedingEntries: [] });
        }
        daysMap.get(entry.date)!.feedingEntries.push(entry);
      });

      // Вычисляем средние оценки
      const summaries = Array.from(daysMap.values()).map(day => {
        if (day.stateEntries.length > 0) {
          day.avgScore = Math.round(day.stateEntries.reduce((sum, e) => sum + e.state_score, 0) / day.stateEntries.length);
        }
        return day;
      }).sort((a, b) => b.date.localeCompare(a.date));

      setDaySummaries(summaries);
    } catch (error) {
      console.error('Error loading log:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setView('view');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Сегодня';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Вчера';

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="pb-28">

      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4 px-2">Лог активности</h2>

        {daySummaries.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Нет записей</p>
        ) : (
          <div className="space-y-2">
            {daySummaries.map((day, index) => (
              <button
                key={day.date}
                onClick={() => handleDayClick(day.date)}
                className="w-full text-left py-3 px-6 rounded-xl bg-white/40 hover:bg-white/60 border border-transparent hover:border-white/60 transition-all animate-fadeInUp btn-interactive"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-24">
                    <div className="text-sm font-medium text-gray-900">{formatDate(day.date)}</div>
                    <div className="text-xs text-gray-500">{day.date}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {day.avgScore && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: STATE_COLORS[day.avgScore] }}>
                            <Activity className="text-white" size={14} />
                          </div>
                          <span className="text-sm text-gray-700">{day.stateEntries.length}x</span>
                        </div>
                      )}

                      {day.symptomEntries.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="text-red-600" size={14} />
                          </div>
                          <span className="text-sm text-gray-700">{day.symptomEntries.length}x</span>
                        </div>
                      )}

                      {day.medicationEntries.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Pill className="text-purple-600" size={14} />
                          </div>
                          <span className="text-sm text-gray-700">{day.medicationEntries.length}x</span>
                        </div>
                      )}

                      {day.feedingEntries.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Utensils className="text-green-600" size={14} />
                          </div>
                          <span className="text-sm text-gray-700">{day.feedingEntries.length}x</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="flex-shrink-0 text-gray-400" size={20} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
