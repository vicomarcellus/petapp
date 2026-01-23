import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { ChevronDown, BarChart3, ClipboardList, Settings, Calendar as CalendarIcon, Bell } from 'lucide-react';
import { useState } from 'react';

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
  const { setView, currentPetId, setCurrentPetId, view } = useStore();
  const [showPetMenu, setShowPetMenu] = useState(false);

  const pets = useLiveQuery(() => db.pets.toArray());
  const currentPet = pets?.find(p => p.id === currentPetId);

  const handleSelectPet = async (petId: number) => {
    const allPets = await db.pets.toArray();
    for (const pet of allPets) {
      await db.pets.update(pet.id!, { isActive: pet.id === petId });
    }
    
    setCurrentPetId(petId);
    setShowPetMenu(false);
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
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white rounded-full transition-all"
            >
              <ArrowLeft size={20} className="text-black" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-black">
            Трекер здоровья
          </h1>
        </div>
        
        {/* Pet Selector */}
        {pets && pets.length > 0 && currentPet && (
          <div className="relative">
            <button
              onClick={() => pets.length > 1 && setShowPetMenu(!showPetMenu)}
              className={`flex items-center gap-2 px-4 py-2 bg-white rounded-full transition-all ${
                pets.length > 1 ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
              }`}
            >
              <span className="text-2xl">{PET_EMOJIS[currentPet.type] || '🐾'}</span>
              <span className="font-semibold text-black">{currentPet.name}</span>
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
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl py-2 min-w-[220px] z-50 border border-gray-100">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => handleSelectPet(pet.id!)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-all ${
                        pet.id === currentPetId ? 'bg-gray-50' : ''
                      }`}
                    >
                      <span className="text-2xl">{PET_EMOJIS[pet.type] || '🐾'}</span>
                      <span className="flex-1 text-left font-medium text-black">
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
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={goToToday}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all font-medium text-sm whitespace-nowrap ${
            view === 'calendar' || view === 'add' || view === 'edit' || view === 'view'
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          <CalendarIcon size={16} />
          Календарь
        </button>
        <button
          onClick={() => setView('schedules')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all font-medium text-sm whitespace-nowrap ${
            view === 'schedules'
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          <Bell size={16} />
          Расписания
        </button>
        <button
          onClick={() => setView('analytics')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all font-medium text-sm whitespace-nowrap ${
            view === 'analytics'
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={16} />
          Аналитика
        </button>
        <button
          onClick={() => setView('log')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all font-medium text-sm whitespace-nowrap ${
            view === 'log'
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          <ClipboardList size={16} />
          Лог
        </button>
        <button
          onClick={() => setView('settings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all font-medium text-sm whitespace-nowrap ${
            view === 'settings' || view === 'history'
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-50'
          }`}
        >
          <Settings size={16} />
          Настройки
        </button>
      </div>
    </div>
  );
};
