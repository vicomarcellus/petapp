import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

export const useSchedulerBadge = () => {
  const { currentUser, currentPetId } = useStore();
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadOverdueCount();

      // Обновляем каждую минуту
      const interval = setInterval(loadOverdueCount, 60000);

      // Подписка на изменения
      const medChannel = supabase
        .channel('scheduler_badge_med')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'medication_entries', filter: `pet_id=eq.${currentPetId}` },
          () => loadOverdueCount()
        )
        .subscribe();

      const feedChannel = supabase
        .channel('scheduler_badge_feed')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'feeding_entries', filter: `pet_id=eq.${currentPetId}` },
          () => loadOverdueCount()
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(medChannel);
        supabase.removeChannel(feedChannel);
      };
    }
  }, [currentUser, currentPetId]);

  const loadOverdueCount = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      const [medRes, feedRes] = await Promise.all([
        supabase
          .from('medication_entries')
          .select('id, scheduled_time, completed')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .eq('is_scheduled', true)
          .gte('date', today),
        supabase
          .from('feeding_entries')
          .select('id, scheduled_time, completed')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
          .eq('is_scheduled', true)
          .gte('date', today)
      ]);

      const medOverdue = (medRes.data || []).filter(m => !m.completed && m.scheduled_time && m.scheduled_time < now).length;
      const feedOverdue = (feedRes.data || []).filter(f => !f.completed && f.scheduled_time && f.scheduled_time < now).length;

      setOverdueCount(medOverdue + feedOverdue);
    } catch (error) {
      console.error('Error loading overdue count:', error);
    }
  };

  return overdueCount;
};
