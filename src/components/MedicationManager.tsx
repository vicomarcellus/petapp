import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore } from '../store';
import { Medication, MedicationEntry, MEDICATION_COLORS } from '../types';
import { Pill, Check } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  date: string;
  editingMedId?: number | null;
  onEditComplete?: () => void;
}

export const MedicationManager = ({ date, editingMedId, onEditComplete }: Props) => {
  const currentPetId = useStore(state => state.currentPetId);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [medTime, setMedTime] = useState('');
  const [selectedColor, setSelectedColor] = useState(MEDICATION_COLORS[0]);

  const medications = useLiveQuery(
    async () => {
      if (!currentPetId) return [];
      return await db.medications.where('petId').equals(currentPetId).toArray();
    },
    [currentPetId]
  );

  const editingMed = useLiveQuery(
    async () => {
      if (!editingMedId) return null;
      return await db.medicationEntries.get(editingMedId);
    },
    [editingMedId]
  );

  // Загружаем данные редактируемого лекарства
  useEffect(() => {
    if (editingMed) {
      setMedName(editingMed.medication_name);
      setDosage(editingMed.dosage);
      setMedTime(editingMed.time);
      setSelectedColor(editingMed.color || MEDICATION_COLORS[0]);
    }
  }, [editingMed]);

  const handleAddMedication = async () => {
    if (!medName.trim() || !dosage.trim() || !currentPetId) return;

    const now = new Date();
    const timeStr = medTime || format(now, 'HH:mm');

    // Получаем или создаем тег лекарства
    let medTag = await db.medicationTags.where('name').equals(medName.trim()).filter(t => t.petId === currentPetId).first();
    if (!medTag) {
      const allTags = await db.medicationTags.where('petId').equals(currentPetId).toArray();
      const colorIndex = allTags.length % MEDICATION_COLORS.length;
      const tagId = await db.medicationTags.add({
        name: medName.trim(),
        petId: currentPetId,
        color: MEDICATION_COLORS[colorIndex],
      });
      medTag = await db.medicationTags.get(tagId);
    }

    const medColor = medTag?.color || selectedColor;

    if (editingMed) {
      await db.medicationEntries.update(editingMed.id!, {
        medication_name: medName.trim(),
        dosage,
        time: timeStr,
        color: medColor,
      });
      if (onEditComplete) onEditComplete();
    } else {
      const entry: MedicationEntry = {
        date,
        petId: currentPetId,
        medication_name: medName.trim(),
        dosage,
        time: timeStr,
        timestamp: now.getTime(),
        color: medColor,
      };

      await db.medicationEntries.add(entry);

      const existing = medications?.find(m => m.name === medName.trim());
      if (!existing) {
        await db.medications.add({
          name: medName.trim(),
          petId: currentPetId,
          color: medColor,
          default_dosage: dosage,
        });
      }
    }

    setMedName('');
    setDosage('');
    setMedTime('');
    setSelectedColor(MEDICATION_COLORS[0]);
  };

  const handleCancel = () => {
    setMedName('');
    setDosage('');
    setMedTime('');
    setSelectedColor(MEDICATION_COLORS[0]);
    if (onEditComplete) onEditComplete();
  };

  const handleSelectSavedMed = (med: Medication) => {
    setMedName(med.name);
    setDosage(med.default_dosage || '');
    setSelectedColor(med.color);
  };

  return (
    <div className="space-y-2">
      <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
        {/* Быстрый выбор */}
        {!editingMed && medications && medications.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Быстрый выбор
            </label>
            <div className="flex flex-wrap gap-1.5">
              {medications.map((med) => (
                <button
                  key={med.id}
                  onClick={() => handleSelectSavedMed(med)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: med.color }}
                >
                  <Pill size={12} />
                  {med.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Название
            </label>
            <input
              type="text"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
              placeholder="Преднизолон"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Дозировка
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
              placeholder="0.3 мг"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Время
          </label>
          <input
            type="time"
            value={medTime}
            onChange={(e) => setMedTime(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Цвет
          </label>
          <div className="flex gap-1.5">
            {MEDICATION_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-7 h-7 rounded-full transition-all ${
                  selectedColor === color ? 'ring-2 ring-black scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleAddMedication}
            disabled={!medName.trim() || !dosage.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            {editingMed ? 'Сохранить' : 'Добавить'}
          </button>
          {(editingMed || onEditComplete) && (
            <button
              onClick={handleCancel}
              className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors font-medium text-xs"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
