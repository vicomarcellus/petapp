import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { formatDate } from '../utils';
import { STATE_COLORS } from '../types';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Header } from './Header';
import { QuickChat } from './QuickChat';
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
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4">
        <div className="max-w-5xl mx-auto">
          <Header />
          <div className="text-center py-8 text-gray-400">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={18} className="text-black" />
              </button>
              <h2 className="text-xl font-bold text-black">
                {format(currentDate, 'LLLL yyyy', { locale: ru })}
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
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

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    onMouseEnter={(e) => {
                      if ((dayMeds && dayMeds.length > 0) || entry || (dayStates && dayStates.length > 0)) {
                        setHoveredDate(dateStr);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({ 
                          x: rect.left + rect.width / 2, 
                          y: rect.top
                        });
                        setTimeout(() => setShowTooltip(true), 300);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredDate(null);
                      setShowTooltip(false);
                    }}
                    disabled={!isCurrentMonth}
                    className={`
                      aspect-square rounded-full p-1.5 transition-all border-2
                      ${isCurrentMonth ? 'hover:scale-105 cursor-pointer' : 'opacity-20 cursor-not-allowed'}
                      ${isTodayDate ? 'border-gray-400' : 'border-transparent'}
                    `}
                    style={{
                      backgroundColor: avgDayScore && isCurrentMonth
                        ? STATE_COLORS[avgDayScore] + '15'
                        : '#F5F5F7',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-0.5">
                      <span className="text-base font-semibold text-gray-700">
                        {format(date, 'd')}
                      </span>
                      {avgDayScore && isCurrentMonth && (
                        <div 
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: STATE_COLORS[avgDayScore] }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {hoveredDate && showTooltip && (() => {
              const entry = entriesMap.get(hoveredDate);
              const states = statesMap.get(hoveredDate);
              const meds = medsMap.get(hoveredDate);
              
              if (!entry && !states && !meds) return null;
              
              return (
                <div
                  className="fixed z-[9999] bg-black text-white px-4 py-3 rounded-2xl text-xs shadow-2xl pointer-events-none whitespace-nowrap"
                  style={{
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: 'translate(-50%, calc(-100% - 12px))',
                    maxWidth: '250px',
                  }}
                >
                  {states && states.length > 0 && (
                    <div className="mb-2">
                      <div className="font-semibold mb-1">
                        Состояние ({states.length} записей):
                      </div>
                      {states.map((state, idx) => (
                        <div key={idx} className="text-xs text-gray-300 mb-0.5">
                          {state.time}: {state.state_score}/5
                        </div>
                      ))}
                    </div>
                  )}
                  {entry && entry.symptoms && entry.symptoms.length > 0 && (
                    <div className="mb-2">
                      <div className="font-semibold mb-1">Симптомы:</div>
                      <div className="text-xs text-gray-300">
                        {entry.symptoms.join(', ')}
                      </div>
                    </div>
                  )}
                  {meds && meds.length > 0 && (
                    <div>
                      <div className="font-semibold mb-1">Лекарства:</div>
                      {meds.map((med, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: med.color }}
                          />
                          <span className="text-xs">
                            {med.medication_name} {med.dosage} • {med.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="space-y-3">
            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-3 shadow-sm">
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

            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-3 shadow-sm">
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

            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-3 shadow-sm">
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

        <QuickChat />
      </div>
    </div>
  );
};
