import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Plus, Check, Trash2 } from 'lucide-react';
import { Pet } from '../types';
import { AlertModal, ConfirmModal } from './Modal';

const PET_TYPES = [
  { value: 'cat', label: '🐱 Кот', emoji: '🐱' },
  { value: 'dog', label: '🐶 Собака', emoji: '🐶' },
  { value: 'bird', label: '🐦 Птица', emoji: '🐦' },
  { value: 'rabbit', label: '🐰 Кролик', emoji: '🐰' },
  { value: 'hamster', label: '🐹 Хомяк', emoji: '🐹' },
  { value: 'other', label: '🐾 Другое', emoji: '🐾' },
];

export const PetManager = () => {
  const { currentPetId, setCurrentPetId, currentUser } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('cat');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadPets();
      
      // Подписка на изменения
      const channel = supabase
        .channel('pets_changes')
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
    } finally {
      setLoading(false);
    }
  };

  const handleAddPet = async () => {
    if (!petName.trim() || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('pets')
        .insert({
          user_id: currentUser.id,
          name: petName.trim(),
          type: petType,
          is_active: pets.length === 0, // Первый питомец активен
        })
        .select()
        .single();

      if (error) throw error;

      // Если это первый питомец, делаем его активным
      if (pets.length === 0 && data) {
        setCurrentPetId(data.id!);
      }

      setPetName('');
      setPetType('cat');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding pet:', error);
      setErrorModal({ title: 'Ошибка', message: 'Ошибка при добавлении питомца' });
    }
  };

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
    } catch (error) {
      console.error('Error selecting pet:', error);
    }
  };

  const handleDeletePet = async (petId: number) => {
    if (!currentUser) return;

    try {
      // Удаляем питомца (каскадное удаление настроено в БД)
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (error) throw error;

      // Если удалили активного питомца, выбираем первого доступного
      if (currentPetId === petId) {
        const remainingPets = pets.filter(p => p.id !== petId);
        if (remainingPets.length > 0) {
          await handleSelectPet(remainingPets[0].id!);
        } else {
          setCurrentPetId(null);
        }
      }
      
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting pet:', error);
      setErrorModal({ title: 'Ошибка', message: 'Ошибка при удалении питомца' });
    }
  };

  const getPetEmoji = (type: string) => {
    return PET_TYPES.find(t => t.value === type)?.emoji || '🐾';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4">
        <div className="text-center py-4 text-gray-400 text-sm">
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
        Питомцы
      </div>

      {/* Список питомцев */}
      <div className="space-y-2 mb-3">
        {pets.map((pet, index) => (
          <div
            key={pet.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer animate-fadeInUp ${
              pet.id === currentPetId
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:scale-[1.02]'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleSelectPet(pet.id!)}
          >
            <div className="text-2xl">{getPetEmoji(pet.type)}</div>
            <div className="flex-1">
              <div className="font-bold text-black text-sm">{pet.name}</div>
              <div className="text-xs text-gray-500">
                {PET_TYPES.find(t => t.value === pet.type)?.label.replace(/🐱|🐶|🐦|🐰|🐹|🐾/g, '').trim()}
              </div>
            </div>
            {pet.id === currentPetId && (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(pet.id!);
              }}
              className="p-2 hover:bg-red-100 rounded-full transition-all duration-200 text-red-600 hover:scale-110 active:scale-95"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Форма добавления */}
      {showAddForm ? (
        <div className="bg-gray-50 rounded-xl p-3 space-y-3">
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Имя питомца"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
          />
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              Тип питомца
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PET_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPetType(type.value)}
                  className={`p-2 rounded-xl text-sm transition-all ${
                    petType === type.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddPet}
              disabled={!petName.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm font-medium disabled:opacity-50"
            >
              <Check size={14} />
              Добавить
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setPetName('');
                setPetType('cat');
              }}
              className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          Добавить питомца
        </button>
      )}

      {pets.length === 0 && !showAddForm && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Добавьте первого питомца
        </div>
      )}

      <AlertModal
        isOpen={!!errorModal}
        title={errorModal?.title || ''}
        message={errorModal?.message || ''}
        onClose={() => setErrorModal(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Удалить питомца?"
        message="Все данные о нем будут удалены!"
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={() => deleteConfirm !== null && handleDeletePet(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
