import { useEffect } from 'react';
import { autoBackup } from '../services/backup';

/**
 * Хук для автоматического создания бэкапов
 * Создает бэкап каждые 5 минут если были изменения
 */
export function useAutoBackup() {
  useEffect(() => {
    // Создаем бэкап при загрузке приложения
    autoBackup().catch(console.error);

    // Создаем бэкап каждые 5 минут
    const interval = setInterval(() => {
      autoBackup().catch(console.error);
    }, 5 * 60 * 1000); // 5 минут

    // Создаем бэкап перед закрытием страницы
    const handleBeforeUnload = () => {
      autoBackup().catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
