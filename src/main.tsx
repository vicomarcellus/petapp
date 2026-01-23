import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './debug' // Загружаем утилиты отладки

// Проверяем версию базы данных и сбрасываем если нужно
const checkAndResetDB = async () => {
  const DB_VERSION_KEY = 'catHealthDB_version';
  const CURRENT_VERSION = '7';
  const storedVersion = localStorage.getItem(DB_VERSION_KEY);
  
  if (storedVersion !== CURRENT_VERSION) {
    console.log('Обновление базы данных до версии', CURRENT_VERSION);
    try {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('CatHealthDB');
        request.onsuccess = () => {
          console.log('База данных успешно удалена');
          localStorage.setItem(DB_VERSION_KEY, CURRENT_VERSION);
          resolve();
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          console.warn('Удаление базы заблокировано, перезагрузите страницу');
          resolve();
        };
      });
    } catch (error) {
      console.error('Ошибка при удалении базы:', error);
    }
  }
};

checkAndResetDB().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
