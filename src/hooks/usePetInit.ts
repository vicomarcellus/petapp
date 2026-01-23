import { useEffect } from 'react';
import { db } from '../db';
import { useStore } from '../store';

/**
 * Хук для инициализации текущего питомца при загрузке приложения
 */
export const usePetInit = () => {
  const { currentPetId, setCurrentPetId } = useStore();

  useEffect(() => {
    const initPet = async () => {
      // Если питомец уже выбран, ничего не делаем
      if (currentPetId !== null) return;

      // Ищем активного питомца
      const activePet = await db.pets.filter(p => p.isActive === true).first();
      
      if (activePet) {
        setCurrentPetId(activePet.id!);
      } else {
        // Если нет активного, берем первого доступного
        const firstPet = await db.pets.toCollection().first();
        if (firstPet) {
          await db.pets.update(firstPet.id!, { isActive: true });
          setCurrentPetId(firstPet.id!);
        }
      }
    };

    initPet();
  }, [currentPetId, setCurrentPetId]);
};
