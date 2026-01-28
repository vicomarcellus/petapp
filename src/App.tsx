import { useStore } from './store';
import { Calendar } from './components/Calendar';
import { EntryView } from './components/EntryView';
import { ActivityLog } from './components/ActivityLog';
import { Settings } from './components/Settings';
import { ChangeHistory } from './components/ChangeHistory';
import { Analytics } from './components/Analytics';
import { Auth } from './components/Auth';
// import { Checklist } from './components/Checklist';
import { useAutoBackup } from './hooks/useAutoBackup';
import { usePetInit } from './hooks/usePetInit';
// import { useTaskNotifications } from './hooks/useTaskNotifications';

function App() {
  const { view, currentUser, currentPetId } = useStore();
  
  // Автоматические бэкапы
  useAutoBackup();
  
  // Инициализация текущего питомца
  usePetInit();
  
  // Глобальные уведомления о задачах - ОТКЛЮЧЕНО
  // const { NotificationModal } = useTaskNotifications();

  // Если пользователь не авторизован, показываем экран входа
  if (!currentUser) {
    return <Auth />;
  }

  // Если нет питомца, показываем настройки для добавления
  if (currentPetId === null) {
    return <Settings />;
  }

  return (
    <div className="min-h-screen">
      {view === 'calendar' && <Calendar />}
      {(view === 'add' || view === 'edit' || view === 'view') && <EntryView />}
      {/* {view === 'checklist' && <Checklist />} */}
      {view === 'log' && <ActivityLog />}
      {view === 'settings' && <Settings />}
      {view === 'history' && <ChangeHistory />}
      {view === 'analytics' && <Analytics />}
      
      {/* Глобальные уведомления о задачах - ОТКЛЮЧЕНО */}
      {/* {NotificationModal} */}
    </div>
  );
}

export default App;
