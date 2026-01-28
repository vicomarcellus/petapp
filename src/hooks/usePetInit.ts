import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

/**
 * Хук для инициализации текущего питомца при загрузке приложения
 */
export const usePetInit = () => {
  const { currentPetId, setCurrentPetId, currentUser } = useStore();

  useEffect(() => {
    const initPet = async () => {
      // Если нет пользователя, ничего не делаем
      if (!currentUser) return;

      // Если питомец уже выбран, ничего не делаем
      if (currentPetId !== null) return;

      try {
        // Ищем активного питомца для текущего пользователя
        const { data: activePet, error: activeError } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .single();
        
        if (!activeError && activePet) {
          setCurrentPetId(activePet.id!);
        } else {
          // Если нет активного, берем первого доступного для этого пользователя
          const { data: firstPet, error: firstError } = await supabase
            .from('pets')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
            
          if (!firstError && firstPet) {
            await supabase
              .from('pets')
              .update({ is_active: true })
              .eq('id', firstPet.id);
            setCurrentPetId(firstPet.id!);
          }
          // НЕ создаем дефолтного питомца - пользователь сам добавит
        }
      } catch (error) {
        console.error('Error initializing pet:', error);
      }
    };

    initPet();
  }, [currentPetId, setCurrentPetId, currentUser]);
};
