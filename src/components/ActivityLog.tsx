import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Pill, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { generateDaySummary } from '../services/summary';
import { Header } from './Header';

interface DayGroup {
  date: string;
  dayEntry?: any;
  medications: any[];
  summary?: string;
  loadingSummary?: boolean;
}

export const ActivityLog = () => {
  const { setView, currentPetId } = useStore();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Map<string, string>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());

  const dayEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.dayEntries.where('petId').equals(currentPetId).reverse().sortBy('date');
    },
    [currentPetId]
  );

  const medicationEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.medicationEntries.where('petId').equals(currentPetId).reverse().sortBy('date');
    },
    [currentPetId]
  );

  // Группируем по дням
  const dayGroups: DayGroup[] = [];
  const processedDates = new Set<string>();

  // Собираем все уникальные даты
  const allDates = new Set<string>();
  dayEntries?.forEach(e => allDates.add(e.date));
  medicationEntries?.forEach(e => allDates.add(e.date));

  // Сортируем даты в обратном порядке
  const sortedDates = Array.from(allDates).sort().reverse();

  sortedDates.forEach(date => {
    if (!processedDates.has(date)) {
      const dayEntry = dayEntries?.find(e => e.date === date);
      const meds = medicationEntries?.filter(e => e.date === date) || [];
      
      dayGroups.push({
        date,
        dayEntry,
        medications: meds,
      });
      
      processedDates.add(date);
    }
  });

  const toggleDay = async (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
      
      // Генерируем summary если его еще нет
      if (!summaries.has(date) && !loadingSummaries.has(date)) {
        setLoadingSummaries(prev => new Set(prev).add(date));
        
        const group = dayGroups.find(g => g.date === date);
        if (group) {
          const summary = await generateDaySummary(group.dayEntry, group.medications);
          setSummaries(prev => new Map(prev).set(date, summary));
        }
        
        setLoadingSummaries(prev => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
      }
    }
    setExpandedDays(newExpanded);
  };

  const handleBack = () => {
    setView('calendar');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="space-y-1.5">
          {dayGroups.map((group) => {
            const isExpanded = expandedDays.has(group.date);
            const dateObj = parseISO(group.date);

            return (
              <div key={group.date} className="bg-white rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleDay(group.date)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {group.dayEntry && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: STATE_COLORS[group.dayEntry.state_score] }}
                      >
                        <span className="text-white font-bold text-xs">
                          {group.dayEntry.state_score}
                        </span>
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-bold text-black text-sm">
                        {format(dateObj, 'd MMMM yyyy', { locale: ru })}
                      </div>
                      {group.dayEntry && (
                        <div className="text-xs text-gray-500">
                          {STATE_LABELS[group.dayEntry.state_score]}
                          {group.medications.length > 0 && ` • ${group.medications.length} лекарств`}
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                    {/* AI Summary */}
                    {loadingSummaries.has(group.date) ? (
                      <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Генерация резюме...</span>
                      </div>
                    ) : summaries.has(group.date) ? (
                      <div className="bg-blue-50 rounded-2xl p-2.5 mt-2">
                        <div className="text-xs font-semibold text-blue-600 mb-0.5">AI Резюме</div>
                        <div className="text-xs text-gray-700">{summaries.get(group.date)}</div>
                      </div>
                    ) : null}

                    {/* Medications */}
                    {group.medications.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-gray-500 mb-1.5">Лекарства</div>
                        <div className="space-y-1">
                          {group.medications.map((med) => (
                            <div
                              key={med.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: med.color }}
                              >
                                <Pill className="text-white" size={10} />
                              </div>
                              <span className="text-gray-700">
                                {med.medication_name} {med.dosage}
                              </span>
                              <span className="text-gray-400 text-xs ml-auto">{med.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    {group.dayEntry?.note && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Заметка</div>
                        <div className="text-xs text-gray-700">{group.dayEntry.note}</div>
                      </div>
                    )}

                    {group.dayEntry?.symptoms && group.dayEntry.symptoms.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Симптомы</div>
                        <div className="flex flex-wrap gap-1">
                          {group.dayEntry.symptoms.map((symptom: string) => (
                            <span key={symptom} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                              {symptom}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {dayGroups.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>Нет записей</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
