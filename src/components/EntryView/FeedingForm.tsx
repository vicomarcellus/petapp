import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ArrowLeft, Utensils } from 'lucide-react';
import { Input, Textarea } from '../ui/Input';

interface FeedingFormProps {
  selectedDate: string;
  currentPetId: number;
  currentUser: any;
  editingId: number | null;
  onSave: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export const FeedingForm = ({
  selectedDate,
  currentPetId,
  currentUser,
  editingId,
  onSave,
  onCancel,
  onBack
}: FeedingFormProps) => {
  const [foodName, setFoodName] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<'g' | 'ml' | 'none'>('g');
  const [foodTime, setFoodTime] = useState('');
  const [foodNote, setFoodNote] = useState('');

  const savedFoods = useLiveQuery(
    async () => {
      if (!currentPetId || !currentUser) return [];
      return await db.foodTags
        .where('petId').equals(currentPetId)
        .filter(f => f.userId === currentUser.id)
        .toArray();
    },
    [currentPetId, currentUser]
  );

  useEffect(() => {
    if (editingId) {
      db.feedingEntries.get(editingId).then(feeding => {
        if (feeding) {
          setFoodName(feeding.food_name);
          setFoodAmount(feeding.amount);
          setFoodUnit(feeding.unit);
          setFoodTime(feeding.time);
          setFoodNote(feeding.note || '');
        }
      });
    } else {
      const now = new Date();
      setFoodTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim() || !foodTime) return;

    const [hours, minutes] = foodTime.split(':').map(Number);
    const timestamp = new Date(selectedDate).setHours(hours, minutes, 0, 0);

    const amountStr = foodUnit === 'none' ? '' : `${foodAmount} ${foodUnit === 'g' ? 'г' : 'мл'}`;

    if (editingId) {
      await db.feedingEntries.update(editingId, {
        food_name: foodName.trim(),
        amount: amountStr,
        unit: foodUnit,
        time: foodTime,
        timestamp,
        note: foodNote || undefined,
      });
    } else {
      await db.feedingEntries.add({
        userId: currentUser.id,
        petId: currentPetId,
        date: selectedDate,
        time: foodTime,
        timestamp,
        food_name: foodName.trim(),
        amount: amountStr,
        unit: foodUnit,
        note: foodNote || undefined,
        created_at: Date.now(),
      });

      // Сохраняем в справочник если новое
      const existing = savedFoods?.find(f => f.name === foodName.trim());
      if (!existing) {
        await db.foodTags.add({
          userId: currentUser.id,
          name: foodName.trim(),
          petId: currentPetId,
          default_unit: foodUnit,
          default_amount: foodAmount,
        });
      }
    }

    onSave();
  };

  const handleSelectSavedFood = (food: any) => {
    setFoodName(food.name);
    setFoodAmount(food.default_amount || '');
    setFoodUnit(food.default_unit || 'g');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        {!editingId && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
        )}
        <h2 className="text-xl font-bold text-black flex-1">
          {editingId ? 'Редактировать кормление' : 'Добавить кормление'}
        </h2>
      </div>

      {/* Предустановленные варианты */}
      {!editingId && (
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Быстрый выбор
          </label>
          <div className="flex flex-wrap gap-2">
            {/* Предустановленные */}
            <button
              type="button"
              onClick={() => {
                setFoodName('Вода');
                setFoodUnit('ml');
                setFoodAmount('');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              💧 Вода
            </button>
            <button
              type="button"
              onClick={() => {
                setFoodName('Сухой корм');
                setFoodUnit('g');
                setFoodAmount('');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              🥘 Сухой корм
            </button>
            <button
              type="button"
              onClick={() => {
                setFoodName('Влажный корм');
                setFoodUnit('g');
                setFoodAmount('');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            >
              🍖 Влажный корм
            </button>
            
            {/* Сохранённые корма */}
            {savedFoods && savedFoods.length > 0 && savedFoods.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => handleSelectSavedFood(food)}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <Utensils size={14} />
                {food.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Input
        label="Название"
        type="text"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
        placeholder="Корм / Вода"
        required
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            label="Количество"
            type="text"
            value={foodAmount}
            onChange={(e) => setFoodAmount(e.target.value.replace('.', ','))}
            placeholder="50"
            disabled={foodUnit === 'none'}
          />
          {/* Быстрые кнопки */}
          {foodUnit !== 'none' && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['25', '50', '75', '100', '150'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFoodAmount(val)}
                  className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Единица
          </label>
          <select
            value={foodUnit}
            onChange={(e) => setFoodUnit(e.target.value as 'g' | 'ml' | 'none')}
            className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-black transition-all text-black outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
          >
            <option value="g">граммы</option>
            <option value="ml">мл</option>
            <option value="none">без ед.</option>
          </select>
        </div>
      </div>

      <Input
        label="Время"
        type="time"
        value={foodTime}
        onChange={(e) => setFoodTime(e.target.value)}
        required
      />

      <Textarea
        value={foodNote}
        onChange={(e) => setFoodNote(e.target.value)}
        placeholder="Заметка (опционально)..."
        rows={3}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-gray-100 text-black rounded-full hover:bg-gray-200 transition-colors font-semibold"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={!foodName.trim() || !foodTime}
          className="flex-1 px-4 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Сохранить
        </button>
      </div>
    </form>
  );
};
