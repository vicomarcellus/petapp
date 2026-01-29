import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { ChevronDown, BarChart3, ClipboardList, Settings, Calendar as CalendarIcon, LogOut, ArrowLeft } from 'lucide-react';
import { Pet } from '../types';

interface HeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

const PET_EMOJIS: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  rabbit: '🐰',
  hamster: '🐹',
  other: '🐾',
};

export const Header = ({ showBackButton = false, onBack }: HeaderProps) => {
  const { setView, currentPetId, setCurrentPetId, view, currentUser, setCurrentUser } = useStore();
  const [showPetMenu, setShowPetMenu] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadPets();
      
      // Подписка на изменения
      const channel = supabase
        .channel('header_pets_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pets', filter: `user_id=eq.${currentUser.id}` },
          () => loadPets()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  const loadPets = async () => {
    if (!currentUser) return;
    
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error loading pets:', error);
    }
  };

  const currentPet = pets.find(p => p.id === currentPetId);

  const handleSelectPet = async (petId: number) => {
    if (!currentUser) return;
    
    try {
      // Обновляем все питомцы
      await supabase
        .from('pets')
        .update({ is_active: false })
        .eq('user_id', currentUser.id);

      await supabase
        .from('pets')
        .update({ is_active: true })
        .eq('id', petId);
      
      setCurrentPetId(petId);
      setShowPetMenu(false);
    } catch (error) {
      console.error('Error selecting pet:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const goToToday = () => {
    const today = new Date();
    const { setCurrentYear, setCurrentMonth, setSelectedDate } = useStore.getState();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(null);
    setView('calendar');
  };

  return (
    <header className="mb-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-black/5 rounded-xl transition-all"
            >
              <ArrowLeft size={20} className="text-black" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">
              Трекер здоровья
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">
                {currentUser.firstName}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pet Selector */}
          {pets.length > 0 && currentPet && (
            <div className="relative">
              <button
                onClick={() => pets.length > 1 && setShowPetMenu(!showPetMenu)}
                className={`flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl transition-all ${
                  pets.length > 1 ? 'hover:border-black cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-2xl">{PET_EMOJIS[currentPet.type] || '🐾'}</span>
                <span className="font-semibold text-black text-base">{currentPet.name}</span>
                {pets.length > 1 && (
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showPetMenu ? 'rotate-180' : ''}`} />
                )}
              </button>

              {showPetMenu && pets.length > 1 && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPetMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl py-2 min-w-[240px] z-50 border border-gray-200">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => handleSelectPet(pet.id!)}
                        className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-all ${
                          pet.id === currentPetId ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className="text-2xl">{PET_EMOJIS[pet.type] || '🐾'}</span>
                        <span className="flex-1 text-left font-medium text-black">
                          {pet.name}
                        </span>
                        {pet.id === currentPetId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={goToToday}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
            view === 'calendar' || view === 'add' || view === 'edit' || view === 'view'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-black hover:bg-black/5'
          }`}
        >
          <CalendarIcon size={18} />
          Календарь
        </button>
        <button
          onClick={() => setView('analytics')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
            view === 'analytics'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-black hover:bg-black/5'
          }`}
        >
          <BarChart3 size={18} />
          Аналитика
        </button>
        <button
          onClick={() => setView('log')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
            view === 'log'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-black hover:bg-black/5'
          }`}
        >
          <ClipboardList size={18} />
          Лог
        </button>
        <button
          onClick={() => setView('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
            view === 'settings' || view === 'history'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-black hover:bg-black/5'
          }`}
        >
          <Settings size={18} />
          Настройки
        </button>
      </nav>
    </header>
  );
};
