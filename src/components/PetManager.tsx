import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Plus, Check, Trash2 } from 'lucide-react';

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

  const pets = useLiveQuery(() => 
    currentUser ? db.pets.where('userId').equals(currentUser.id).toArray() : [],
    [currentUser]
  );

  const handleAddPet = async () => {
    if (!petName.trim() || !currentUser) return;

    try {
      const newPetId = await db.pets.add({
        userId: currentUser.id,
        name: petName.trim(),
        type: petType,
        created_at: Date.now(),
        isActive: false,
      });

      // Если это первый питомец, делаем его активным
      if (!pets || pets.length === 0) {
        await db.pets.update(newPetId, { isActive: true });
        setCurrentPetId(newPetId as number);
      }

      setPetName('');
      setPetType('cat');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding pet:', error);
    }
  };

  const handleSelectPet = async (petId: number) => {
    if (!currentUser || !pets) return;
    
    // Используем уже загруженные данные
    for (const pet of pets) {
      await db.pets.update(pet.id!, { isActive: pet.id === petId });
    }
    
    setCurrentPetId(petId);
  };

  const handleDeletePet = async (petId: number) => {
    if (!confirm('Удалить питомца? Все данные о нем будут удалены!')) return;
    if (!currentUser || !pets) return;

    try {
      // Удаляем все данные питомца
      await db.dayEntries.where('petId').equals(petId).delete();
      await db.medicationEntries.where('petId').equals(petId).delete();
      await db.medications.where('petId').equals(petId).delete();
      await db.symptomTags.where('petId').equals(petId).delete();
      await db.medicationTags.where('petId').equals(petId).delete();
      await db.pets.delete(petId);

      // Если удалили активного питомца, выбираем первого доступного
      if (currentPetId === petId) {
        const remainingPets = pets.filter(p => p.id !== petId);
        if (remainingPets.length > 0) {
          await handleSelectPet(remainingPets[0].id!);
        } else {
          setCurrentPetId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting pet:', error);
    }
  };

  const getPetEmoji = (type: string) => {
    return PET_TYPES.find(t => t.value === type)?.emoji || '🐾';
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
        Питомцы
      </div>

      {/* Список питомцев */}
      <div className="space-y-2 mb-3">
        {pets?.map((pet) => (
          <div
            key={pet.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
              pet.id === currentPetId
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
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
                handleDeletePet(pet.id!);
              }}
              className="p-2 hover:bg-red-100 rounded-full transition-all text-red-600"
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
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
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

      {(!pets || pets.length === 0) && !showAddForm && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Добавьте первого питомца
        </div>
      )}
    </div>
  );
};
