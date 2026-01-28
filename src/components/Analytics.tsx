import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Header } from './Header';
import { TrendingUp, Activity } from 'lucide-react';
import { STATE_COLORS } from '../types';

export const Analytics = () => {
  const { currentUser, currentPetId } = useStore();
  const [avgScore, setAvgScore] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
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
        .select('state_score')
        .eq('user_id', currentUser.id)
        .eq('pet_id', currentPetId)
        .gte('date', startDate);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const avg = data.reduce((sum, e) => sum + e.state_score, 0) / data.length;
        setAvgScore(Number(avg.toFixed(1)));
        setTotalEntries(data.length);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
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
