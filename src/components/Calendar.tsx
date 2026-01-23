import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { formatDate } from '../utils';
import { STATE_COLORS } from '../types';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { QuickChat } from './QuickChat';
import { Header } from './Header';
import { useState } from 'react';

export const Calendar = () => {
  const { currentYear, currentMonth, setCurrentYear, setCurrentMonth, setSelectedDate, setView, currentPetId } = useStore();
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const entries = useLiveQuery(
    () => {
      if (!currentPetId) return [];
      return db.dayEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );

  const medicationEntries = useLiveQuery(
    () => {
      if (!currentPetId) return [];
      return db.medicationEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );

  const entriesMap = new Map(entries?.map(e => [e.date, e]) || []);
  const medsMap = new Map<string, typeof medicationEntries>();
  medicationEntries?.forEach(med => {
    if (!medsMap.has(med.date)) {
      medsMap.set(med.date, []);
    }
    medsMap.get(med.date)!.push(med);
  });
  
  const currentDate = new Date(currentYear, currentMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
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
    setView(entry ? 'view' : 'add');
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth());
  };

  // Статистика
  const thisMonthEntries = entries?.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate.getMonth() === currentDate.getMonth() && 
           entryDate.getFullYear() === currentYear;
  }) || [];
  
  const avgScore = thisMonthEntries.length > 0
    ? (thisMonthEntries.reduce((sum, e) => sum + e.state_score, 0) / thisMonthEntries.length).toFixed(1)
    : '0';

  const goodDays = thisMonthEntries.filter(e => e.state_score >= 4).length;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {/* Main Calendar Card */}
          <div className="lg:col-span-2 bg-white rounded-xl p-4">
            {/* Month Navigation */}
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

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-400 py-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 relative">
              {weeks.flat().map((date, index) => {
                const dateStr = formatDate(date);
                const entry = entriesMap.get(dateStr);
                const dayMeds = medsMap.get(dateStr);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(date)}
                    onMouseEnter={(e) => {
                      if (dayMeds && dayMeds.length > 0) {
                        setHoveredDate(dateStr);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
                      }
                    }}
                    onMouseLeave={() => setHoveredDate(null)}
                    disabled={!isCurrentMonth}
                    className={`
                      aspect-square rounded-2xl p-1.5 transition-all border-2
                      ${isCurrentMonth ? 'hover:scale-105 cursor-pointer' : 'opacity-20 cursor-not-allowed'}
                      ${isTodayDate ? 'border-gray-400' : 'border-transparent'}
                    `}
                    style={{
                      backgroundColor: entry && isCurrentMonth
                        ? STATE_COLORS[entry.state_score] + '15'
                        : '#F5F5F7',
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-full gap-0.5">
                      <span className="text-base font-semibold text-gray-700">
                        {format(date, 'd')}
                      </span>
                      {entry && isCurrentMonth && (
                        <div 
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: STATE_COLORS[entry.state_score] }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tooltip */}
            {hoveredDate && medsMap.get(hoveredDate) && (
              <div
                className="fixed z-50 bg-black text-white px-3 py-2 rounded-2xl text-xs shadow-2xl pointer-events-none"
                style={{
                  left: `${tooltipPosition.x}px`,
                  top: `${tooltipPosition.y - 10}px`,
                  transform: 'translate(-50%, -100%)',
                  maxWidth: '200px',
                }}
              >
                <div className="font-semibold mb-1">Лекарства:</div>
                {medsMap.get(hoveredDate)!.map((med, idx) => (
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

          {/* Stats Sidebar */}
          <div className="space-y-3">
            {/* Avg Score Card */}
            <div className="bg-white rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Activity className="text-white" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-0.5">Средняя оценка</p>
                  <p className="text-2xl font-bold text-black">{avgScore}</p>
                  <p className="text-gray-400 text-xs">За месяц</p>
                </div>
              </div>
            </div>

            {/* Total Entries Card */}
            <div className="bg-white rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-[#F5F5F7] rounded-2xl flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
                  {thisMonthEntries.length}
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-xs mb-0.5">Записей</p>
                  <p className="text-2xl font-bold text-black">{thisMonthEntries.length}</p>
                  <p className="text-gray-400 text-xs">В этом месяце</p>
                </div>
              </div>
            </div>

            {/* Good Days Card */}
            <div className="bg-white rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-[#F5F5F7] rounded-2xl flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
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
