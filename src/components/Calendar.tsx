import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { formatDate } from '../utils';
import { STATE_COLORS } from '../types';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DayEntry, StateEntry, MedicationEntry } from '../types';

export const Calendar = () => {
  const { currentYear, currentMonth, setCurrentYear, setCurrentMonth, setSelectedDate, setView, currentPetId, currentUser } = useStore();
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [entries, setEntries] = useState<DayEntry[]>([]);
  const [stateEntries, setStateEntries] = useState<StateEntry[]>([]);
  const [medicationEntries, setMedicationEntries] = useState<MedicationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date(currentYear, currentMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const startDateStr = format(monthStart, 'yyyy-MM-dd');
  const endDateStr = format(monthEnd, 'yyyy-MM-dd');

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadData();

      // Подписка на изменения
      const channel = supabase
        .channel('calendar_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'day_entries', filter: `pet_id=eq.${currentPetId}` },
          () => loadData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'state_entries', filter: `pet_id=eq.${currentPetId}` },
          () => loadData()
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'medication_entries', filter: `pet_id=eq.${currentPetId}` },
          () => loadData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, currentPetId, startDateStr, endDateStr]);

  const loadData = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      setLoading(true);
      const [dayRes, stateRes, medRes] = await Promise.all([
        supabase
          .from('day_entries')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('state_entries')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDateStr)
          .lte('date', endDateStr),
        supabase
          .from('medication_entries')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
      ]);

      if (dayRes.data) setEntries(dayRes.data);
      if (stateRes.data) setStateEntries(stateRes.data);
      if (medRes.data) setMedicationEntries(medRes.data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const entriesMap = useMemo(() =>
    new Map(entries.map(e => [e.date, e])),
    [entries]
  );

  const statesMap = useMemo(() => {
    const map = new Map<string, StateEntry[]>();
    stateEntries.forEach(state => {
      if (!map.has(state.date)) {
        map.set(state.date, []);
      }
      map.get(state.date)!.push(state);
    });
    return map;
  }, [stateEntries]);

  const medsMap = useMemo(() => {
    const map = new Map<string, MedicationEntry[]>();
    medicationEntries.forEach(med => {
      if (!map.has(med.date)) {
        map.set(med.date, []);
      }
      map.get(med.date)!.push(med);
    });
    return map;
  }, [medicationEntries]);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    const entry = entriesMap.get(dateStr);
    const states = statesMap.get(dateStr);
    setView((entry || (states && states.length > 0)) ? 'view' : 'add');
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  const thisMonthEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate.getMonth() === currentDate.getMonth() &&
      entryDate.getFullYear() === currentYear;
  });

  const avgScore = thisMonthEntries.length > 0
    ? (thisMonthEntries.reduce((sum, e) => sum + e.state_score, 0) / thisMonthEntries.length).toFixed(1)
    : '0';

  const goodDays = thisMonthEntries.filter(e => e.state_score >= 4).length;

  const thisMonthStateEntries = stateEntries.filter(s => {
    const stateDate = new Date(s.date);
    return stateDate.getMonth() === currentDate.getMonth() &&
      stateDate.getFullYear() === currentYear;
  });

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="pb-28">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-6 shadow-sm animate-stagger">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={18} className="text-black" />
            </button>
            <h2 className="text-xl font-bold text-black">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <ChevronRight size={18} className="text-black" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-400 py-0.5">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 relative">
            {weeks.flat().map((date, index) => {
              const dateStr = formatDate(date);
              const entry = entriesMap.get(dateStr);
              const dayStates = statesMap.get(dateStr);
              const dayMeds = medsMap.get(dateStr);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isTodayDate = isToday(date);

              const avgDayScore = dayStates && dayStates.length > 0
                ? Math.round(dayStates.reduce((sum, s) => sum + s.state_score, 0) / dayStates.length) as 1 | 2 | 3 | 4 | 5
                : entry?.state_score;

              // Определяем общий тренд дня (последняя запись)
              const dayTrend = dayStates && dayStates.length > 0 
                ? dayStates[dayStates.length - 1].trend 
                : undefined;

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={(e) => {
                    if ((dayMeds && dayMeds.length > 0) || entry || (dayStates && dayStates.length > 0)) {
                      setHoveredDate(dateStr);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = {
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      };
                      console.log('Tooltip position:', pos, 'rect:', rect);
                      setTooltipPosition(pos);
                      setTimeout(() => setShowTooltip(true), 300);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredDate(null);
                    setShowTooltip(false);
                  }}
                  disabled={!isCurrentMonth}
                  className={`
                      aspect-square rounded-full p-1.5 transition-all border-2 animate-stagger
                      ${isCurrentMonth ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed'}
                      ${isTodayDate ? 'border-gray-400' : 'border-transparent'}
                    `}
                  style={{
                    backgroundColor: avgDayScore && isCurrentMonth
                      ? STATE_COLORS[avgDayScore] + '15'
                      : '#F5F5F7',
                    animationDelay: `${index * 20}ms`,
                    opacity: isCurrentMonth ? 1 : 0.2
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-0.5">
                    <span className="text-base font-semibold text-gray-700">
                      {format(date, 'd')}
                    </span>
                    {avgDayScore && isCurrentMonth && (
                      <div className="flex items-center justify-center gap-0.5">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: STATE_COLORS[avgDayScore] }}
                        />
                        {dayTrend && (
                          <div 
                            className="w-3 h-3 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: dayTrend === 'up' ? '#10B98120' : dayTrend === 'down' ? '#EF444420' : '#3B82F620'
                            }}
                          >
                            <span className="text-[10px] leading-none">
                              {dayTrend === 'up' ? '↑' : dayTrend === 'down' ? '↓' : '→'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {hoveredDate && showTooltip && createPortal(
            (() => {
              const entry = entriesMap.get(hoveredDate);
              const states = statesMap.get(hoveredDate);
              const meds = medsMap.get(hoveredDate);

              if (!entry && !states && !meds) return null;

              // Определяем, показывать тултип сверху или снизу
              const shouldShowBelow = tooltipPosition.y < 250; // Если близко к верху экрана
              const offset = 24; // Одинаковый отступ для обоих направлений

              return (
                <div
                  className="fixed z-50 pointer-events-none"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: shouldShowBelow 
                      ? `translate(-50%, calc(100% + ${offset}px))` 
                      : `translate(-50%, calc(-100% - ${offset}px))`,
                    width: 'max-content',
                    maxWidth: '300px',
                  }}
                >
                  <div 
                    className="bg-black text-white p-4 rounded-2xl text-sm shadow-2xl animate-scaleIn"
                    style={{
                      originBottom: shouldShowBelow ? 'top' : 'bottom'
                    }}
                  >
                    {states && states.length > 0 && (
                      <div className="mb-3 last:mb-0">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                          Состояние ({states.length}):
                        </div>
                        {states.map((state, idx) => {
                          const trendIcon = state.trend === 'up' ? '↑' : state.trend === 'down' ? '↓' : state.trend === 'same' ? '→' : '';
                          const trendColor = state.trend === 'up' ? '#10B981' : state.trend === 'down' ? '#EF4444' : '#3B82F6';
                          return (
                            <div key={idx} className="text-sm text-white font-medium mb-1 flex items-center gap-1.5">
                              <span>{state.time}: {state.state_score}/5</span>
                              {trendIcon && (
                                <span 
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                                  style={{ backgroundColor: trendColor + '30', color: trendColor }}
                                >
                                  {trendIcon}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {entry && entry.symptoms && entry.symptoms.length > 0 && (
                      <div className="mb-3 last:mb-0">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Симптомы:</div>
                        <div className="text-sm text-white font-medium leading-relaxed">
                          {entry.symptoms.join(', ')}
                        </div>
                      </div>
                    )}
                    {meds && meds.length > 0 && (
                      <div className="last:mb-0">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Лекарства:</div>
                        {meds.map((med, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: med.color }}
                            />
                            <span className="text-sm text-white font-medium whitespace-nowrap">
                              {med.medication_name} {med.dosage} • {med.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })(),
            document.body
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-5 shadow-sm animate-stagger" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-black rounded-[20px] flex items-center justify-center flex-shrink-0">
                <Activity className="text-white" size={16} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-0.5">Средняя оценка</p>
                <p className="text-2xl font-bold text-black">{avgScore}</p>
                <p className="text-gray-400 text-xs">За месяц</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-5 shadow-sm animate-stagger" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-[#F5F5F7] rounded-[20px] flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
                {thisMonthStateEntries.length}
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-0.5">Записей состояния</p>
                <p className="text-2xl font-bold text-black">{thisMonthStateEntries.length}</p>
                <p className="text-gray-400 text-xs">В этом месяце</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-5 shadow-sm animate-stagger" style={{ animationDelay: '300ms' }}>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-[#F5F5F7] rounded-[20px] flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
                {goodDays}
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-0.5">Хороших дней</p>
                <p className="text-2xl font-bold text-black">{goodDays}</p>
                <p className="text-gray-400 text-xs">Оценка 4-5</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
