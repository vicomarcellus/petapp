import { Activity, AlertCircle, Pill, Utensils } from 'lucide-react';

interface AddMenuProps {
  onSelect: (type: 'state' | 'symptom' | 'medication' | 'feeding') => void;
  onCancel: () => void;
}

export const AddMenu = ({ onSelect, onCancel }: AddMenuProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">Что добавить?</h2>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelect('state')}
          className="py-4 px-4 rounded-2xl font-medium transition-all bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-blue-100 hover:text-blue-700 hover:border-blue-500"
        >
          <Activity size={24} className="mx-auto mb-2" />
          Состояние
        </button>
        <button
          onClick={() => onSelect('symptom')}
          className="py-4 px-4 rounded-2xl font-medium transition-all bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-red-100 hover:text-red-700 hover:border-red-500"
        >
          <AlertCircle size={24} className="mx-auto mb-2" />
          Симптом
        </button>
        <button
          onClick={() => onSelect('medication')}
          className="py-4 px-4 rounded-2xl font-medium transition-all bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-purple-100 hover:text-purple-700 hover:border-purple-500"
        >
          <Pill size={24} className="mx-auto mb-2" />
          Лекарство
        </button>
        <button
          onClick={() => onSelect('feeding')}
          className="py-4 px-4 rounded-2xl font-medium transition-all bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-green-100 hover:text-green-700 hover:border-green-500"
        >
          <Utensils size={24} className="mx-auto mb-2" />
          Кормление
        </button>
      </div>
      <button
        onClick={onCancel}
        className="w-full px-4 py-3 bg-gray-100 text-black rounded-full hover:bg-gray-200 transition-colors font-medium"
      >
        Отмена
      </button>
    </div>
  );
};
