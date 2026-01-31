import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { TrendingUp, Activity, Pill, AlertCircle, TrendingDown, Calendar, BarChart3, Zap } from 'lucide-react';
import { STATE_COLORS } from '../types';
import type { MedicationEntry, SymptomEntry } from '../types';

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
    if (data.length < 3) {
      setTrend(null);
      return;
    }

    // Берем последние 7 дней и предыдущие 7 дней
    const recentDays = data.slice(-7);
    const previousDays = data.slice(-14, -7);

    if (previousDays.length === 0) {
      setTrend(null);
      return;
    }

    const recentAvg = recentDays.reduce((sum, d) => sum + d.avgScore, 0) / recentDays.length;
    const previousAvg = previousDays.reduce((sum, d) => sum + d.avgScore, 0) / previousDays.length;
    const change = recentAvg - previousAvg;

    // Простой линейный прогноз на следующие 3 дня
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

    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Масштабирование
    const xStep = chartWidth / (chartData.length - 1 || 1);
    const yScale = chartHeight / 5; // 5 - максимальная оценка

    // Создаем путь для линии
    const linePath = chartData.map((point, index) => {
      const x = padding.left + index * xStep;
      const y = padding.top + chartHeight - (point.avgScore * yScale);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Создаем путь для заливки под линией
    const areaPath = `${linePath} L ${padding.left + (chartData.length - 1) * xStep} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    return (
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height} className="mx-auto">
          {/* Сетка */}
          {[1, 2, 3, 4, 5].map(score => {
            const y = padding.top + chartHeight - (score * yScale);
            return (
              <g key={score}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#9CA3AF"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {/* Заливка под линией */}
          <path
            d={areaPath}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Линия графика */}
          <path
            d={linePath}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-drawLine"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
            }}
          />

          {/* Точки */}
          {chartData.map((point, index) => {
            const x = padding.left + index * xStep;
            const y = padding.top + chartHeight - (point.avgScore * yScale);
            const color = STATE_COLORS[Math.round(point.avgScore) as 1 | 2 | 3 | 4 | 5];

            return (
              <g key={index} className="animate-scaleIn" style={{ animationDelay: `${index * 30}ms` }}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all hover:r-7"
                  style={{ cursor: 'pointer' }}
                />
                {/* Дата под точкой (показываем каждую 3-ю) */}
                {index % 3 === 0 && (
                  <text
                    x={x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#9CA3AF"
                  >
                    {new Date(point.date).getDate()}/{new Date(point.date).getMonth() + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* Градиент для заливки */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
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
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedPeriod === days
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
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp transition-all hover:scale-105 hover:shadow-lg" style={{ animationDelay: '100ms' }}>
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

        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp transition-all hover:scale-105 hover:shadow-lg" style={{ animationDelay: '150ms' }}>
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
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp transition-all hover:scale-105 hover:shadow-lg" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                trend.direction === 'up' ? 'bg-green-100' :
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
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 animate-fadeInUp transition-all hover:scale-105 hover:shadow-lg" style={{ animationDelay: '250ms' }}>
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

      {/* Correlations */}
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
                    <div className={`text-sm font-bold ${
                      corr.impact > 0 ? 'text-green-600' :
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
                      className={`h-full ${
                        corr.impact > 0 ? 'bg-green-500' :
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
