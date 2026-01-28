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
          className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-2xl hover:from-blue-100 hover:to-blue-50 transition-all text-center border-2 border-blue-100"
        >
          <div className="text-3xl mb-2">😊</div>
          <div className="text-sm font-semibold text-gray-700">Состояние</div>
        </button>
        <button
          onClick={() => onSelect('symptom')}
          className="p-4 bg-gradient-to-br from-orange-50 to-white rounded-2xl hover:from-orange-100 hover:to-orange-50 transition-all text-center border-2 border-orange-100"
        >
          <div className="text-3xl mb-2">🤒</div>
          <div className="text-sm font-semibold text-gray-700">Симптом</div>
        </button>
        <button
          onClick={() => onSelect('medication')}
          className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl hover:from-gray-100 hover:to-gray-50 transition-all text-center border-2 border-gray-200"
        >
          <div className="text-3xl mb-2">💊</div>
          <div className="text-sm font-semibold text-gray-700">Лекарство</div>
        </button>
        <button
          onClick={() => onSelect('feeding')}
          className="p-4 bg-gradient-to-br from-green-50 to-white rounded-2xl hover:from-green-100 hover:to-green-50 transition-all text-center border-2 border-green-100"
        >
          <div className="text-3xl mb-2">🍽️</div>
          <div className="text-sm font-semibold text-gray-700">Кормление</div>
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
