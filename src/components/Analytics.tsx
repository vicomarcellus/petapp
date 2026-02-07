import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { TrendingUp, Activity, Pill, AlertCircle, TrendingDown, Calendar, BarChart3, Zap } from 'lucide-react';
import { STATE_COLORS } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DayData {
  date: string;
  avgScore: number;
  medications: string[];
  symptoms: string[];
}

interface Correlation {
  medication: string;
  avgScoreWith: number;
  avgScoreWithout: number;
  impact: number;
  daysUsed: number;
}

interface SymptomCorrelation {
  symptom: string;
  avgScore: number;
  occurrences: number;
}

interface Trend {
  direction: 'up' | 'down' | 'stable';
  change: number;
  prediction: number;
}

export const Analytics = () => {
  const { currentUser, currentPetId } = useStore();
  const [avgScore, setAvgScore] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [symptomCorrelations, setSymptomCorrelations] = useState<SymptomCorrelation[]>([]);
  const [trend, setTrend] = useState<Trend | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(30);
  const [bestDays, setBestDays] = useState<DayData[]>([]);
  const [worstDays, setWorstDays] = useState<DayData[]>([]);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadAnalytics();
    }
  }, [currentUser, currentPetId, selectedPeriod]);

  const loadAnalytics = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - selectedPeriod);
      const startDate = daysAgo.toISOString().split('T')[0];

      // Загружаем все данные параллельно
      const [stateRes, medRes, symptomRes] = await Promise.all([
        supabase
          .from('state_entries')
          .select('date, state_score')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDate)
          .order('date', { ascending: true }),
        supabase
          .from('medication_entries')
          .select('date, medication_name')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDate),
        supabase
          .from('symptom_entries')
          .select('date, symptom')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .gte('date', startDate)
      ]);

      if (stateRes.error) throw stateRes.error;

      const stateData = stateRes.data || [];
      const medData = medRes.data || [];
      const symptomData = symptomRes.data || [];

      if (stateData.length > 0) {
        const avg = stateData.reduce((sum, e) => sum + e.state_score, 0) / stateData.length;
        setAvgScore(Number(avg.toFixed(1)));
        setTotalEntries(stateData.length);

        // Группируем по дням с лекарствами и симптомами
        const dayMap = new Map<string, { scores: number[], medications: Set<string>, symptoms: Set<string> }>();

        stateData.forEach(entry => {
          if (!dayMap.has(entry.date)) {
            dayMap.set(entry.date, { scores: [], medications: new Set(), symptoms: new Set() });
          }
          dayMap.get(entry.date)!.scores.push(entry.state_score);
        });

        medData.forEach(entry => {
          if (dayMap.has(entry.date)) {
            dayMap.get(entry.date)!.medications.add(entry.medication_name);
          }
        });

        symptomData.forEach(entry => {
          if (dayMap.has(entry.date)) {
            dayMap.get(entry.date)!.symptoms.add(entry.symptom);
          }
        });

        const chartPoints: DayData[] = Array.from(dayMap.entries()).map(([date, data]) => ({
          date,
          avgScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
          medications: Array.from(data.medications),
          symptoms: Array.from(data.symptoms)
        }));

        setChartData(chartPoints);

        // Вычисляем корреляции с лекарствами
        calculateMedicationCorrelations(chartPoints);

        // Вычисляем корреляции с симптомами
        calculateSymptomCorrelations(chartPoints);

        // Вычисляем тренд и прогноз
        calculateTrend(chartPoints);

        // Находим лучшие и худшие дни
        const sorted = [...chartPoints].sort((a, b) => b.avgScore - a.avgScore);
        setBestDays(sorted.slice(0, 3));
        setWorstDays(sorted.slice(-3).reverse());
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMedicationCorrelations = (data: DayData[]) => {
    const medMap = new Map<string, { withScores: number[], withoutScores: number[] }>();

    // Собираем все уникальные лекарства
    const allMeds = new Set<string>();
    data.forEach(day => day.medications.forEach(med => allMeds.add(med)));

    // Для каждого лекарства собираем оценки с ним и без него
    allMeds.forEach(med => {
      medMap.set(med, { withScores: [], withoutScores: [] });
    });

    data.forEach(day => {
      allMeds.forEach(med => {
        if (day.medications.includes(med)) {
          medMap.get(med)!.withScores.push(day.avgScore);
        } else {
          medMap.get(med)!.withoutScores.push(day.avgScore);
        }
      });
    });

    // Вычисляем корреляции
    const correlations: Correlation[] = [];
    medMap.forEach((scores, med) => {
      if (scores.withScores.length >= 2) {
        const avgWith = scores.withScores.reduce((sum, s) => sum + s, 0) / scores.withScores.length;
        const avgWithout = scores.withoutScores.length > 0
          ? scores.withoutScores.reduce((sum, s) => sum + s, 0) / scores.withoutScores.length
          : avgWith;

        correlations.push({
          medication: med,
          avgScoreWith: Number(avgWith.toFixed(1)),
          avgScoreWithout: Number(avgWithout.toFixed(1)),
          impact: Number((avgWith - avgWithout).toFixed(1)),
          daysUsed: scores.withScores.length
        });
      }
    });

    // Сортируем по влиянию
    correlations.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    setCorrelations(correlations.slice(0, 5));
  };

  const calculateSymptomCorrelations = (data: DayData[]) => {
    const symptomMap = new Map<string, { scores: number[], count: number }>();

    data.forEach(day => {
      day.symptoms.forEach(symptom => {
        if (!symptomMap.has(symptom)) {
          symptomMap.set(symptom, { scores: [], count: 0 });
        }
        symptomMap.get(symptom)!.scores.push(day.avgScore);
        symptomMap.get(symptom)!.count++;
      });
    });

    const correlations: SymptomCorrelation[] = [];
    symptomMap.forEach((data, symptom) => {
      if (data.count >= 2) {
        const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
        correlations.push({
          symptom,
          avgScore: Number(avgScore.toFixed(1)),
          occurrences: data.count
        });
      }
    });

    correlations.sort((a, b) => a.avgScore - b.avgScore);
    setSymptomCorrelations(correlations.slice(0, 5));
  };

  const calculateTrend = (data: DayData[]) => {
    if (data.length < 2) {
      setTrend(null);
      return;
    }

    // Если данных меньше 14, берем половину для сравнения
    const splitPoint = Math.floor(data.length / 2);
    const recentDays = data.slice(splitPoint);
    const previousDays = data.slice(0, splitPoint);

    if (previousDays.length === 0 || recentDays.length === 0) {
      setTrend(null);
      return;
    }

    const recentAvg = recentDays.reduce((sum, d) => sum + d.avgScore, 0) / recentDays.length;
    const previousAvg = previousDays.reduce((sum, d) => sum + d.avgScore, 0) / previousDays.length;
    const change = recentAvg - previousAvg;

    // Простой линейный прогноз на следующие дни
    const prediction = recentAvg + change;

    setTrend({
      direction: change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'stable',
      change: Number(change.toFixed(1)),
      prediction: Number(Math.max(1, Math.min(5, prediction)).toFixed(1))
    });
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          Недостаточно данных для графика
        </div>
      );
    }

    // Подготавливаем данные для Recharts
    const data = chartData.map(day => ({
      date: new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      score: day.avgScore,
      fullDate: day.date,
      medications: day.medications,
      symptoms: day.symptoms
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-[#1F2937] border-none rounded-xl p-3 shadow-lg text-white">
            <p className="text-sm font-medium text-gray-200 mb-1">{label}</p>
            <p className="text-xl font-bold mb-2">{data.score.toFixed(1)} <span className="text-sm font-normal text-gray-400">/ 5.0</span></p>

            {data.medications && data.medications.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Лекарства:</p>
                <div className="flex flex-wrap gap-1">
                  {data.medications.map((med: string, idx: number) => (
                    <span key={idx} className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                      💊 {med}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.symptoms && data.symptoms.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Симптомы:</p>
                <div className="flex flex-wrap gap-1">
                  {data.symptoms.map((symptom: string, idx: number) => (
                    <span key={idx} className="text-xs bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">
                      ⚠️ {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      return null;
    };

    const CustomDot = (props: any) => {
      const { cx, cy, payload } = props;

      if (payload.medications && payload.medications.length > 0) {
        return (
          <g className="animate-fadeIn cursor-pointer hover:scale-110 transition-transform duration-200">
            {/* Tooltip Body */}
            <rect
              x={cx - 14}
              y={cy - 34}
              width={28}
              height={20}
              rx={4}
              fill="#4B5563" // gray-600
            />
            {/* Arrow */}
            <polygon
              points={`${cx - 4},${cy - 14} ${cx + 4},${cy - 14} ${cx},${cy - 8}`}
              fill="#4B5563"
            />
            {/* Emoji */}
            <text
              x={cx}
              y={cy - 19}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="white"
              style={{ pointerEvents: 'none' }}
            >
              💊
            </text>
          </g>
        );
      }

      return (
        <circle cx={cx} cy={cy} r={5} stroke="white" strokeWidth={2} fill="#8B5CF6" />
      );
    };

    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            stroke="#E5E7EB"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
            stroke="#E5E7EB"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={3}
            fill="transparent"
            dot={<CustomDot />}
            activeDot={{ r: 7, stroke: "white", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="pb-28">
      {/* Period selector */}
      <div className="mb-4 flex gap-2 justify-end">
        {[7, 14, 30].map(days => (
          <button
            key={days}
            onClick={() => setSelectedPeriod(days as 7 | 14 | 30)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedPeriod === days
              ? 'bg-black text-white'
              : 'bg-white/60 text-gray-700 hover:bg-white'
              }`}
          >
            {days} дней
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 mb-4 animate-fadeInUp">
        <h2 className="text-xl font-bold mb-4">График состояния</h2>
        {renderChart()}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Средняя оценка</div>
              <div className="text-2xl font-bold">{avgScore}</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">За {selectedPeriod} дней</div>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Activity className="text-green-600" size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500">Всего записей</div>
              <div className="text-2xl font-bold">{totalEntries}</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">За {selectedPeriod} дней</div>
        </div>

        {trend && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${trend.direction === 'up' ? 'bg-green-100' :
                trend.direction === 'down' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                {trend.direction === 'up' ? <TrendingUp className="text-green-600" size={24} /> :
                  trend.direction === 'down' ? <TrendingDown className="text-red-600" size={24} /> :
                    <BarChart3 className="text-gray-600" size={24} />}
              </div>
              <div>
                <div className="text-xs text-gray-500">Тренд</div>
                <div className="text-2xl font-bold">
                  {trend.change > 0 ? '+' : ''}{trend.change}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              {trend.direction === 'up' ? 'Улучшение' :
                trend.direction === 'down' ? 'Ухудшение' : 'Стабильно'}
            </div>
          </div>
        )}

        {trend && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Zap className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Прогноз</div>
                <div className="text-2xl font-bold">{trend.prediction}</div>
              </div>
            </div>
            <div className="text-xs text-gray-600">На ближайшие дни</div>
          </div>
        )}
      </div>

      {/* Correlations and insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Medication correlations */}
        {correlations.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Pill className="text-purple-600" size={20} />
              <h3 className="text-lg font-bold">Влияние лекарств</h3>
            </div>
            <div className="space-y-3">
              {correlations.map((corr, idx) => (
                <div key={idx} className="p-3 bg-white/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{corr.medication}</div>
                    <div className={`text-sm font-bold ${corr.impact > 0 ? 'text-green-600' :
                      corr.impact < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                      {corr.impact > 0 ? '+' : ''}{corr.impact}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>С лекарством: {corr.avgScoreWith}</span>
                    <span>Без: {corr.avgScoreWithout}</span>
                    <span className="ml-auto">{corr.daysUsed} дней</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${corr.impact > 0 ? 'bg-green-500' :
                        corr.impact < 0 ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                      style={{ width: `${Math.min(100, Math.abs(corr.impact) * 20)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Symptom correlations */}
        {symptomCorrelations.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-600" size={20} />
              <h3 className="text-lg font-bold">Симптомы и состояние</h3>
            </div>
            <div className="space-y-3">
              {symptomCorrelations.map((corr, idx) => (
                <div key={idx} className="p-3 bg-white/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{corr.symptom}</div>
                    <div className="text-sm font-bold" style={{ color: STATE_COLORS[Math.round(corr.avgScore) as 1 | 2 | 3 | 4 | 5] }}>
                      {corr.avgScore}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Средняя оценка при симптоме</span>
                    <span className="ml-auto">{corr.occurrences} раз</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${(corr.avgScore / 5) * 100}%`,
                        backgroundColor: STATE_COLORS[Math.round(corr.avgScore) as 1 | 2 | 3 | 4 | 5]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если нет корреляций с симптомами, показываем статистику по дням недели */}
        {symptomCorrelations.length === 0 && chartData.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold">Статистика по дням недели</h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const dayOfWeekMap = new Map<number, number[]>();
                chartData.forEach(day => {
                  const dayOfWeek = new Date(day.date).getDay();
                  if (!dayOfWeekMap.has(dayOfWeek)) {
                    dayOfWeekMap.set(dayOfWeek, []);
                  }
                  dayOfWeekMap.get(dayOfWeek)!.push(day.avgScore);
                });

                const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                const dayStats = Array.from(dayOfWeekMap.entries())
                  .map(([day, scores]) => ({
                    day,
                    name: dayNames[day],
                    avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
                    count: scores.length
                  }))
                  .sort((a, b) => b.avg - a.avg);

                return dayStats.map((stat, idx) => (
                  <div key={idx} className="p-3 bg-white/50 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{stat.name}</div>
                      <div className="text-sm font-bold" style={{ color: STATE_COLORS[Math.round(stat.avg) as 1 | 2 | 3 | 4 | 5] }}>
                        {stat.avg.toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Средняя оценка</span>
                      <span className="ml-auto">{stat.count} дней</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${(stat.avg / 5) * 100}%`,
                          backgroundColor: STATE_COLORS[Math.round(stat.avg) as 1 | 2 | 3 | 4 | 5]
                        }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Если нет корреляций с лекарствами, показываем динамику изменений */}
        {correlations.length === 0 && chartData.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-indigo-600" size={20} />
              <h3 className="text-lg font-bold">Динамика изменений</h3>
            </div>
            <div className="space-y-3">
              {(() => {
                const improvements = chartData.filter((day, idx) => {
                  if (idx === 0) return false;
                  return day.avgScore > chartData[idx - 1].avgScore;
                }).length;

                const declines = chartData.filter((day, idx) => {
                  if (idx === 0) return false;
                  return day.avgScore < chartData[idx - 1].avgScore;
                }).length;

                const stable = chartData.length - 1 - improvements - declines;

                const maxScore = Math.max(...chartData.map(d => d.avgScore));
                const minScore = Math.min(...chartData.map(d => d.avgScore));
                const range = maxScore - minScore;

                return (
                  <>
                    <div className="p-3 bg-green-50 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Улучшений</div>
                        <div className="text-lg font-bold text-green-600">{improvements}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((improvements / (chartData.length - 1)) * 100).toFixed(0)}% дней
                      </div>
                    </div>

                    <div className="p-3 bg-red-50 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Ухудшений</div>
                        <div className="text-lg font-bold text-red-600">{declines}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((declines / (chartData.length - 1)) * 100).toFixed(0)}% дней
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Стабильно</div>
                        <div className="text-lg font-bold text-gray-600">{stable}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((stable / (chartData.length - 1)) * 100).toFixed(0)}% дней
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Диапазон оценок</div>
                        <div className="text-lg font-bold text-blue-600">{range.toFixed(1)}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        От {minScore.toFixed(1)} до {maxScore.toFixed(1)}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Best and worst days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bestDays.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-600" size={20} />
              <h3 className="text-lg font-bold">Лучшие дни</h3>
            </div>
            <div className="space-y-2">
              {bestDays.map((day, idx) => (
                <div key={idx} className="p-3 bg-green-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-lg font-bold text-green-600">{day.avgScore.toFixed(1)}</div>
                  </div>
                  {day.medications.length > 0 && (
                    <div className="text-xs text-gray-600">
                      💊 {day.medications.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {worstDays.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp" style={{ animationDelay: '450ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="text-red-600" size={20} />
              <h3 className="text-lg font-bold">Худшие дни</h3>
            </div>
            <div className="space-y-2">
              {worstDays.map((day, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-lg font-bold text-red-600">{day.avgScore.toFixed(1)}</div>
                  </div>
                  {day.symptoms.length > 0 && (
                    <div className="text-xs text-gray-600">
                      ⚠️ {day.symptoms.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
