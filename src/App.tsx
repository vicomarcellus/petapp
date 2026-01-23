import { useStore } from './store';
import { Calendar } from './components/Calendar';
import { EntryView } from './components/EntryView';
import { ActivityLog } from './components/ActivityLog';
import { Settings } from './components/Settings';
import { ChangeHistory } from './components/ChangeHistory';
import { Analytics } from './components/Analytics';
import { MedicationSchedules } from './components/MedicationSchedules';
import { useAutoBackup } from './hooks/useAutoBackup';
import { usePetInit } from './hooks/usePetInit';

function App() {
  const { view } = useStore();
  
  // Автоматические бэкапы
  useAutoBackup();
  
  // Инициализация текущего питомца
  usePetInit();

  return (
    <div className="min-h-screen">
      {view === 'calendar' && <Calendar />}
      {(view === 'add' || view === 'edit' || view === 'view') && <EntryView />}
      {view === 'log' && <ActivityLog />}
      {view === 'settings' && <Settings />}
      {view === 'history' && <ChangeHistory />}
      {view === 'analytics' && <Analytics />}
      {view === 'schedules' && <MedicationSchedules />}
    </div>
  );
}

export default App;
