import { useStore } from '../store';
import { Header } from './Header';

export const ChangeHistory = () => {
  const { setView } = useStore();

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4">
      <div className="max-w-5xl mx-auto">
        <Header 
          showBackButton 
          onBack={() => setView('settings')} 
        />
        
        <div className="bg-white rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold mb-4">История изменений</h2>
          <p className="text-gray-600 mb-4">
            Этот компонент ещё переделывается под Supabase
          </p>
          <button
            onClick={() => setView('settings')}
            className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800"
          >
            Вернуться к настройкам
          </button>
        </div>
      </div>
    </div>
  );
};
