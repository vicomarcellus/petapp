import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { TrendingUp, TrendingDown, Minus, Pill, Activity } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { STATE_COLORS, STATE_LABELS } from '../types';
import { Header } from './Header';

export const Analytics = () => {
  const { setView, currentYear, currentMonth, currentPetId } = useStore();

  const currentDate = new Date(currentYear, currentMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const dayEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.dayEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );

  const medicationEntries = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.medicationEntries.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );

  // Фильтруем записи за текущий месяц
  const thisMonthEntries = dayEntries?.filter(e => {
    const entryDate = parseISO(e.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  }).sort((a, b) => a.date.localeCompare(b.date)) || [];

  const thisMonthMeds = medicationEntries?.filter(e => {
    const entryDate = parseISO(e.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  }) || [];

  // Статистика
  const avgScore = thisMonthEntries.length > 0
    ? (thisMonthEntries.reduce((sum, e) => sum + e.state_score, 0) / thisMonthEntries.length).toFixed(1)
    : '0';

  const goodDays = thisMonthEntries.filter(e => e.state_score >= 4).length;
  const badDays = thisMonthEntries.filter(e => e.state_score <= 2).length;

  // Тренд (сравниваем первую и вторую половину месяца)
  const midPoint = Math.floor(thisMonthEntries.length / 2);
  const firstHalf = thisMonthEntries.slice(0, midPoint);
  const secondHalf = thisMonthEntries.slice(midPoint);
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, e) => sum + e.state_score, 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, e) => sum + e.state_score, 0) / secondHalf.length
    : 0;

  const trend = secondHalfAvg - firstHalfAvg;
  const trendIcon = trend > 0.3 ? <TrendingUp size={20} /> : trend < -0.3 ? <TrendingDown size={20} /> : <Minus size={20} />;
  const trendColor = trend > 0.3 ? 'text-green-600' : trend < -0.3 ? 'text-red-600' : 'text-gray-600';
  const trendText = trend > 0.3 ? 'Улучшение' : trend < -0.3 ? 'Ухудшение' : 'Стабильно';

  // Статистика по лекарствам
  const medStats = new Map<string, { count: number; color: string }>();
  thisMonthMeds.forEach(med => {
    const key = med.medication_name;
    if (!medStats.has(key)) {
      medStats.set(key, { count: 0, color: med.color });
    }
    medStats.get(key)!.count++;
  });

  const topMeds = Array.from(medStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // График - все дни месяца
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const chartData = allDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = thisMonthEntries.find(e => e.date === dateStr);
    return {
      date: day,
      score: entry?.state_score || null,
    };
  });

  const maxScore = 5;
  const chartHeight = 200;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="text-sm text-gray-500 mb-4">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </div>

        <div className="space-y-3">
          {/* Основная статистика */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4">
              <div className="text-xs text-gray-500 mb-1">Средняя оценка</div>
              <div className="text-3xl font-bold text-black">{avgScore}</div>
            </div>
            <div className="bg-white rounded-2xl p-4">
              <div className="text-xs text-gray-500 mb-1">Хороших дней</div>
              <div className="text-3xl font-bold text-green-600">{goodDays}</div>
            </div>
            <div className="bg-white rounded-2xl p-4">
              <div className="text-xs text-gray-500 mb-1">Плохих дней</div>
              <div className="text-3xl font-bold text-red-600">{badDays}</div>
            </div>
            <div className="bg-white rounded-2xl p-4">
              <div className={`flex items-center gap-2 mb-1 ${trendColor}`}>
                {trendIcon}
                <div className="text-xs font-semibold">{trendText}</div>
              </div>
              <div className="text-2xl font-bold text-black">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}
              </div>
            </div>
          </div>

          {/* График состояния */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-black" />
              <h2 className="text-lg font-bold text-black">График состояния</h2>
            </div>

            {thisMonthEntries.length > 0 ? (
              <div className="relative" style={{ paddingLeft: '32px', paddingBottom: '24px', paddingTop: '8px' }}>
                <div className="relative" style={{ height: chartHeight }}>
                  {/* Горизонтальные линии сетки */}
                  {[5, 4, 3, 2, 1].map(score => {
                    const yPos = ((maxScore - score) / maxScore) * chartHeight;
                    return (
                      <div key={score}>
                        <div
                          className="absolute border-t border-gray-100"
                          style={{ 
                            top: `${yPos}px`,
                            left: 0,
                            right: 0,
                          }}
                        />
                        <span 
                          className="absolute text-xs text-gray-400"
                          style={{
                            top: `${yPos - 8}px`,
                            left: '-28px',
                          }}
                        >
                          {score}
                        </span>
                      </div>
                    );
                  })}

                  {/* График */}
                  {chartData.map((point, i) => {
                    if (point.score === null) return null;
                    
                    const x = (i / (chartData.length - 1)) * 100;
                    const y = ((maxScore - point.score) / maxScore) * chartHeight;
                    
                    // Находим следующую точку для линии
                    const nextPoint = chartData.slice(i + 1).find(p => p.score !== null);
                    let line = null;
                    
                    if (nextPoint) {
                      const nextIndex = chartData.indexOf(nextPoint);
                      const x2 = (nextIndex / (chartData.length - 1)) * 100;
                      const y2 = ((maxScore - nextPoint.score) / maxScore) * chartHeight;
                      
                      const length = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2));
                      const angle = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
                      
                      line = (
                        <div
                          key={`line-${i}`}
                          className="absolute bg-black"
                          style={{
                            left: `${x}%`,
                            top: `${y}px`,
                            width: `${length}%`,
                            height: '2px',
                            transformOrigin: '0 0',
                            transform: `rotate(${angle}deg)`,
                          }}
                        />
                      );
                    }

                    return (
                      <div key={i}>
                        {line}
                        <div
                          className="absolute rounded-full border-2 border-white"
                          style={{
                            left: `${x}%`,
                            top: `${y}px`,
                            width: '12px',
                            height: '12px',
                            backgroundColor: STATE_COLORS[point.score],
                            transform: 'translate(-50%, -50%)',
                          }}
                          title={`${format(point.date, 'd MMM', { locale: ru })}: ${STATE_LABELS[point.score]}`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Подписи дат */}
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{format(monthStart, 'd MMM', { locale: ru })}</span>
                  <span>{format(monthEnd, 'd MMM', { locale: ru })}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Нет данных за этот месяц</p>
              </div>
            )}
          </div>

          {/* Топ лекарств */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Pill size={18} className="text-black" />
              <h2 className="text-lg font-bold text-black">Топ лекарств</h2>
            </div>

            {topMeds.length > 0 ? (
              <div className="space-y-3">
                {topMeds.map(([name, data], index) => {
                  const maxCount = topMeds[0][1].count;
                  const percentage = (data.count / maxCount) * 100;

                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="text-sm font-medium text-black">{name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-600">{data.count}×</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: data.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Нет данных о лекарствах</p>
              </div>
            )}
          </div>

          {/* Легенда состояний */}
          <div className="bg-white rounded-2xl p-4">
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
              Шкала состояний
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(score => (
                <div key={score} className="text-center">
                  <div
                    className="w-full aspect-square rounded-2xl flex items-center justify-center text-white font-bold text-lg mb-1"
                    style={{ backgroundColor: STATE_COLORS[score] }}
                  >
                    {score}
                  </div>
                  <div className="text-xs text-gray-600">{STATE_LABELS[score]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
