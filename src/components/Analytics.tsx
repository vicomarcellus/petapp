import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Header } from './Header';
import { TrendingUp, Activity } from 'lucide-react';
import { STATE_COLORS } from '../types';

interface DayData {
  date: string;
  avgScore: number;
}

export const Analytics = () => {
  const { currentUser, currentPetId } = useStore();
  const [avgScore, setAvgScore] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadAnalytics();
    }
  }, [currentUser, currentPetId]);

  const loadAnalytics = async () => {
    if (!currentUser || !currentPetId) return;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('state_entries')
        .select('date, state_score')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum, e) => sum + e.state_score, 0) / data.length;
        setAvgScore(Number(avg.toFixed(1)));
        setTotalEntries(data.length);

        // Группируем по дням и вычисляем среднее
        const dayMap = new Map<string, number[]>();
        data.forEach(entry => {
          if (!dayMap.has(entry.date)) {
            dayMap.set(entry.date, []);
          }
          dayMap.get(entry.date)!.push(entry.state_score);
        });

        const chartPoints: DayData[] = Array.from(dayMap.entries()).map(([date, scores]) => ({
          date,
          avgScore: scores.reduce((sum, s) => sum + s, 0) / scores.length
        }));

        setChartData(chartPoints);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
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
          />

          {/* Точки */}
          {chartData.map((point, index) => {
            const x = padding.left + index * xStep;
            const y = padding.top + chartHeight - (point.avgScore * yScale);
            const color = STATE_COLORS[Math.round(point.avgScore) as 1 | 2 | 3 | 4 | 5];
            
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
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

        <div className="bg-white rounded-2xl p-6 mb-4">
          <h2 className="text-xl font-bold mb-4">График состояния</h2>
          {renderChart()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Средняя оценка</div>
                <div className="text-3xl font-bold">{avgScore}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">За последние 30 дней</div>
          </div>

          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <Activity className="text-green-600" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-500">Всего записей</div>
                <div className="text-3xl font-bold">{totalEntries}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">За последние 30 дней</div>
          </div>
        </div>
      </div>
    </div>
  );
};
