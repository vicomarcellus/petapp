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
      {/* Top Bar - Glass Morphism Style */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: Logo/Title */}
        <div className="flex items-center gap-6">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2.5 hover:bg-white/60 rounded-full transition-all backdrop-blur-sm"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
          )}
          <h1 className="text-2xl font-semibold text-gray-800">
            Трекер здоровья
          </h1>
        </div>

        {/* Center: Navigation - Glass Pills */}
        <nav className="flex items-center gap-2 bg-white/40 backdrop-blur-md rounded-full p-1.5 border border-white/60">
          <button
            onClick={goToToday}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              view === 'calendar' || view === 'add' || view === 'edit' || view === 'view'
                ? 'bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            Календарь
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              view === 'analytics'
                ? 'bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            Аналитика
          </button>
          <button
            onClick={() => setView('log')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              view === 'log'
                ? 'bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            Лог
          </button>
          <button
            onClick={() => setView('settings')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              view === 'settings' || view === 'history'
                ? 'bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            Настройки
          </button>
        </nav>

        {/* Right: Pet Selector + User */}
        <div className="flex items-center gap-3">
          {/* Pet Selector - Glass Style */}
          {pets.length > 0 && currentPet && (
            <div className="relative">
              <button
                onClick={() => pets.length > 1 && setShowPetMenu(!showPetMenu)}
                className={`flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/80 rounded-full hover:bg-white/80 transition-all shadow-sm ${
                  pets.length > 1 ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-xl">{PET_EMOJIS[currentPet.type] || '🐾'}</span>
                <span className="font-medium text-gray-900 text-sm">{currentPet.name}</span>
                {pets.length > 1 && (
                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${showPetMenu ? 'rotate-180' : ''}`} />
                )}
              </button>

              {showPetMenu && pets.length > 1 && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowPetMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl py-2 min-w-[200px] z-50 border border-white/60">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => handleSelectPet(pet.id!)}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/60 transition-all ${
                          pet.id === currentPetId ? 'bg-white/60' : ''
                        }`}
                      >
                        <span className="text-xl">{PET_EMOJIS[pet.type] || '🐾'}</span>
                        <span className="flex-1 text-left font-medium text-gray-900 text-sm">
                          {pet.name}
                        </span>
                        {pet.id === currentPetId && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Avatar - Glass Circle */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="w-[42px] h-[42px] rounded-full bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white/80 flex items-center justify-center transition-all"
              title={`Выйти (${currentUser.firstName})`}
            >
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-700">
                  {currentUser.firstName.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
