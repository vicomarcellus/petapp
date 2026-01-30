import { useStore } from './store';
import { Calendar } from './components/Calendar';
import { EntryView } from './components/EntryView';
import { ActivityLog } from './components/ActivityLog';
import { Settings } from './components/Settings';
import { ChangeHistory } from './components/ChangeHistory';
import { Analytics } from './components/Analytics';
import { Auth } from './components/Auth';
import { Header } from './components/Header';
import { usePetInit } from './hooks/usePetInit';

function App() {
  const { view, currentUser, currentPetId } = useStore();

  // Инициализация текущего питомца
  usePetInit();

  // Если пользователь не авторизован, показываем экран входа
  if (!currentUser) {
    return <Auth />;
  }

  // Если нет питомца, показываем настройки для добавления
  if (currentPetId === null) {
    return <Settings />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Header />
        <div key={view} className="animate-fadeInUp">
          {view === 'calendar' && <Calendar />}
          {(view === 'add' || view === 'edit' || view === 'view') && <EntryView />}
          {view === 'log' && <ActivityLog />}
          {view === 'settings' && <Settings />}
          {view === 'history' && <ChangeHistory />}
          {view === 'analytics' && <Analytics />}
        </div>
      </div>
    </div>
  );
}

export default App;
