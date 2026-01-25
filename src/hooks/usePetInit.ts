import { useEffect } from 'react';
import { db } from '../db';
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

      // Ищем активного питомца для текущего пользователя
      const activePet = await db.pets
        .filter(p => p.userId === currentUser.id && p.isActive === true)
        .first();
      
      if (activePet) {
        setCurrentPetId(activePet.id!);
      } else {
        // Если нет активного, берем первого доступного для этого пользователя
        const firstPet = await db.pets
          .where('userId')
          .equals(currentUser.id)
          .first();
          
        if (firstPet) {
          await db.pets.update(firstPet.id!, { isActive: true });
          setCurrentPetId(firstPet.id!);
        }
        // НЕ создаем дефолтного питомца - пользователь сам добавит
      }
    };

    initPet();
  }, [currentPetId, setCurrentPetId, currentUser]);
};
