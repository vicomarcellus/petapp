import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Header } from './Header';
import { STATE_COLORS } from '../types';
import type { StateEntry, MedicationEntry, SymptomEntry } from '../types';

export const ActivityLog = () => {
  const { currentUser, currentPetId } = useStore();
  const [entries, setEntries] = useState<any[]>([]);
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

      const [stateRes, medRes, symptomRes] = await Promise.all([
        supabase.from('state_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('timestamp', { ascending: false }).limit(50),
        supabase.from('medication_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('timestamp', { ascending: false }).limit(50),
        supabase.from('symptom_entries').select('*').eq('user_id', currentUser.id).eq('pet_id', currentPetId).gte('date', startDate).order('timestamp', { ascending: false }).limit(50)
      ]);

      const allEntries = [
        ...(stateRes.data || []).map(e => ({ ...e, type: 'state' })),
        ...(medRes.data || []).map(e => ({ ...e, type: 'medication' })),
        ...(symptomRes.data || []).map(e => ({ ...e, type: 'symptom' }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);

      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading log:', error);
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

        <div className="bg-white rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">Лог активности</h2>
          
          {entries.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет записей</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="text-xs text-gray-500 w-24">{entry.date} {entry.time}</div>
                  {entry.type === 'state' && (
                    <>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: STATE_COLORS[entry.state_score] }}>{entry.state_score}</div>
                      <div className="flex-1 text-sm">Состояние</div>
                    </>
                  )}
                  {entry.type === 'medication' && (
                    <>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <div className="flex-1 text-sm">{entry.medication_name} {entry.dosage}</div>
                    </>
                  )}
                  {entry.type === 'symptom' && (
                    <div className="flex-1 text-sm">Симптом: {entry.symptom}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
