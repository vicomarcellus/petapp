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
    <header className="mb-10">
      {/* Top Bar - Minimalist */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="mt-1 p-2.5 hover:bg-black/5 rounded-2xl transition-all"
            >
              <ArrowLeft size={22} className="text-black" />
            </button>
          )}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight leading-none">
              Трекер здоровья
            </h1>
            {currentPet && (
              <p className="text-gray-400 text-sm mt-2 font-medium">
                Дневник для {currentPet.name}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Pet Selector - Prominent */}
          {pets.length > 0 && currentPet && (
            <div className="relative">
              <button
                onClick={() => pets.length > 1 && setShowPetMenu(!showPetMenu)}
                className={`flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-900 rounded-2xl transition-all hover:shadow-lg ${
                  pets.length > 1 ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-3xl leading-none">{PET_EMOJIS[currentPet.type] || '🐾'}</span>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-black text-base leading-tight">{currentPet.name}</span>
                  {pets.length > 1 && (
                    <span className="text-xs text-gray-400 font-medium">Сменить</span>
                  )}
                </div>
                {pets.length > 1 && (
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ml-1 ${showPetMenu ? 'rotate-180' : ''}`} />
                )}
              </button>

              {showPetMenu && pets.length > 1 && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPetMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-3 bg-white rounded-2xl shadow-2xl py-3 min-w-[260px] z-50 border-2 border-gray-900">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => handleSelectPet(pet.id!)}
                        className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-all ${
                          pet.id === currentPetId ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className="text-3xl leading-none">{PET_EMOJIS[pet.type] || '🐾'}</span>
                        <span className="flex-1 text-left font-bold text-black text-base">
                          {pet.name}
                        </span>
                        {pet.id === currentPetId && (
                          <div className="w-2 h-2 rounded-full bg-black" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Menu - Subtle */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-3 text-gray-400 hover:text-black hover:bg-black/5 rounded-2xl transition-all"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation - Bold Pills */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={goToToday}
          className={`group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
            view === 'calendar' || view === 'add' || view === 'edit' || view === 'view'
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'text-gray-400 hover:text-black hover:bg-gray-100'
          }`}
        >
          <CalendarIcon size={20} strokeWidth={2.5} />
          Календарь
        </button>
        <button
          onClick={() => setView('analytics')}
          className={`group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
            view === 'analytics'
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'text-gray-400 hover:text-black hover:bg-gray-100'
          }`}
        >
          <BarChart3 size={20} strokeWidth={2.5} />
          Аналитика
        </button>
        <button
          onClick={() => setView('log')}
          className={`group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
            view === 'log'
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'text-gray-400 hover:text-black hover:bg-gray-100'
          }`}
        >
          <ClipboardList size={20} strokeWidth={2.5} />
          Лог
        </button>
        <button
          onClick={() => setView('settings')}
          className={`group flex items-center gap-2.5 px-6 py-3.5 rounded-2xl transition-all font-bold text-sm whitespace-nowrap ${
            view === 'settings' || view === 'history'
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'text-gray-400 hover:text-black hover:bg-gray-100'
          }`}
        >
          <Settings size={20} strokeWidth={2.5} />
          Настройки
        </button>
      </nav>
    </header>
  );
};
