import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Edit3, Check, X, Plus, Pill, Utensils } from 'lucide-react';
import { SYMPTOM_COLORS } from '../types';
import { PetManager } from './PetManager';

import { ConfirmModal } from './Modal';
import { Input } from './ui/Input';
import { Modal, ModalActions } from './ui/Modal';
import type { SymptomTag, MedicationTag } from '../types';

export const Settings = () => {
  const { currentUser, currentPetId } = useStore();
  const [editingSymptom, setEditingSymptom] = useState<number | null>(null);
  const [editingMed, setEditingMed] = useState<number | null>(null);
  const [editingFood, setEditingFood] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [symptomTags, setSymptomTags] = useState<SymptomTag[]>([]);
  const [medicationTags, setMedicationTags] = useState<MedicationTag[]>([]);
  const [foodTags, setFoodTags] = useState<any[]>([]);
  const [deleteSymptomConfirm, setDeleteSymptomConfirm] = useState<number | null>(null);
  const [deleteMedConfirm, setDeleteMedConfirm] = useState<number | null>(null);
  const [deleteFoodConfirm, setDeleteFoodConfirm] = useState<number | null>(null);
  const [addingMedication, setAddingMedication] = useState(false);
  const [addingFood, setAddingFood] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedAmount, setNewMedAmount] = useState('');
  const [newMedUnit, setNewMedUnit] = useState('мл');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodAmount, setNewFoodAmount] = useState('');
  const [newFoodUnit, setNewFoodUnit] = useState('g');

  useEffect(() => {
    if (currentUser && currentPetId) {
      loadTags();

      // Подписка на изменения
      const symptomChannel = supabase
        .channel('symptom_tags_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'symptom_tags', filter: `pet_id=eq.${currentPetId}` },
          () => loadTags()
        )
        .subscribe();

      const medChannel = supabase
        .channel('medication_tags_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'medication_tags', filter: `pet_id=eq.${currentPetId}` },
          () => loadTags()
        )
        .subscribe();

      const foodChannel = supabase
        .channel('food_tags_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'food_tags', filter: `pet_id=eq.${currentPetId}` },
          () => loadTags()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(symptomChannel);
        supabase.removeChannel(medChannel);
        supabase.removeChannel(foodChannel);
      };
    }
  }, [currentUser, currentPetId]);

  const loadTags = async () => {
    if (!currentUser || !currentPetId) return;

    try {
      const [symptomsRes, medsRes, foodRes] = await Promise.all([
        supabase
          .from('symptom_tags')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId),
        supabase
          .from('medication_tags')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId),
        supabase
          .from('food_tags')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
      ]);

      if (symptomsRes.data) setSymptomTags(symptomsRes.data);
      if (medsRes.data) setMedicationTags(medsRes.data);
      if (foodRes.data) setFoodTags(foodRes.data);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Заполните все поля');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setStatusMessage('Пароль успешно изменен');
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setPasswordError('Ошибка при изменении пароля: ' + (error as Error).message);
    }
  };

  const handleSaveSymptom = async () => {
    if (editingSymptom && editName.trim()) {
      try {
        const { error } = await supabase
          .from('symptom_tags')
          .update({ name: editName.trim(), color: editColor })
          .eq('id', editingSymptom);

        if (error) throw error;

        setEditingSymptom(null);
        setEditName('');
        setEditColor('');
      } catch (error) {
        console.error('Error updating symptom tag:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingSymptom(null);
    setEditName('');
    setEditColor('');
  };

  const handleDeleteSymptom = async (id: number) => {
    try {
      const { error } = await supabase
        .from('symptom_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteSymptomConfirm(null);
    } catch (error) {
      console.error('Error deleting symptom tag:', error);
    }
  };

  const handleDeleteMed = async (id: number) => {
    try {
      const { error } = await supabase
        .from('medication_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteMedConfirm(null);
      
      // Перезагружаем список
      await loadTags();
    } catch (error) {
      console.error('Error deleting medication tag:', error);
    }
  };

  const handleDeleteFood = async (id: number) => {
    try {
      const { error } = await supabase
        .from('food_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDeleteFoodConfirm(null);
      
      // Перезагружаем список
      await loadTags();
    } catch (error) {
      console.error('Error deleting food tag:', error);
    }
  };

  const handleAddMedication = async () => {
    if (!currentUser || !currentPetId || !newMedName.trim()) return;

    try {
      if (editingMed) {
        // Редактирование
        const { error } = await supabase
          .from('medication_tags')
          .update({
            name: newMedName.trim(),
            default_dosage_amount: newMedAmount,
            default_dosage_unit: newMedUnit
          })
          .eq('id', editingMed);

        if (error) throw error;
      } else {
        // Создание
        const { error } = await supabase
          .from('medication_tags')
          .insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            name: newMedName.trim(),
            default_dosage_amount: newMedAmount,
            default_dosage_unit: newMedUnit
          });

        if (error) throw error;
      }

      setAddingMedication(false);
      setEditingMed(null);
      setNewMedName('');
      setNewMedAmount('');
      setNewMedUnit('мл');
      
      // Перезагружаем список
      await loadTags();
    } catch (error) {
      console.error('Error adding medication tag:', error);
    }
  };

  const handleAddFood = async () => {
    if (!currentUser || !currentPetId || !newFoodName.trim()) return;

    try {
      if (editingFood) {
        // Редактирование
        const { error } = await supabase
          .from('food_tags')
          .update({
            name: newFoodName.trim(),
            default_amount: newFoodAmount,
            default_unit: newFoodUnit
          })
          .eq('id', editingFood);

        if (error) throw error;
      } else {
        // Создание
        const { error } = await supabase
          .from('food_tags')
          .insert({
            user_id: currentUser.id,
            pet_id: currentPetId,
            name: newFoodName.trim(),
            default_amount: newFoodAmount,
            default_unit: newFoodUnit
          });

        if (error) throw error;
      }

      setAddingFood(false);
      setEditingFood(null);
      setNewFoodName('');
      setNewFoodAmount('');
      setNewFoodUnit('g');
      
      // Перезагружаем список
      await loadTags();
    } catch (error) {
      console.error('Error adding food tag:', error);
    }
  };

  const handleEditSymptom = (id: number, name: string, color: string) => {
    setEditingSymptom(id);
    setEditName(name);
    setEditColor(color);
  };

  return (
    <div className="pb-28">
      <div className="space-y-4">
        {/* Профиль пользователя */}
        {currentUser && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Профиль
            </h2>
            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Email</div>
                <div className="text-sm text-gray-900">{currentUser.username}</div>
              </div>

              {!changingPassword ? (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Изменить пароль
                </button>
              ) : null}
            </div>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">
            {statusMessage}
          </div>
        )}

        {/* Управление питомцами */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
            Питомцы
          </h2>
          <PetManager />
        </div>

        {/* Теги симптомов */}
        {symptomTags.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
              Теги симптомов
            </h2>
            <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 space-y-1.5">
              {symptomTags.map((tag) => (
                <div key={tag.id}>
                  {editingSymptom === tag.id ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-full focus:border-black transition-all text-black placeholder-gray-400 outline-none text-sm"
                        placeholder="Название"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {SYMPTOM_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`w-7 h-7 rounded-full transition-all ${editColor === color ? 'ring-2 ring-black scale-110' : ''
                              }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleSaveSymptom}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm font-medium"
                        >
                          <Check size={14} />
                          Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl">
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="flex-1 font-medium text-sm text-black">
                        {tag.name}
                      </div>
                      <button
                        onClick={() => handleEditSymptom(tag.id!, tag.name, tag.color)}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteSymptomConfirm(tag.id!)}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Теги лекарств */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
            Лекарства
          </h2>
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 space-y-2">
            {medicationTags.map((tag) => (
              <div 
                key={tag.id} 
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Pill className="text-purple-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-black">{tag.name}</div>
                  {tag.default_dosage_amount && (
                    <div className="text-xs text-gray-500">
                      {tag.default_dosage_amount} {tag.default_dosage_unit}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingMed(tag.id!);
                    setNewMedName(tag.name);
                    setNewMedAmount(tag.default_dosage_amount || '');
                    setNewMedUnit(tag.default_dosage_unit || 'мл');
                    setAddingMedication(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => setDeleteMedConfirm(tag.id!)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {medicationTags.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет сохраненных лекарств</p>
            )}

            <button
              onClick={() => {
                setEditingMed(null);
                setNewMedName('');
                setNewMedAmount('');
                setNewMedUnit('мл');
                setAddingMedication(true);
              }}
              className="w-full py-3 text-sm font-medium text-gray-600 hover:text-black transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 rounded-xl"
            >
              <Plus size={16} />
              Добавить лекарство
            </button>
          </div>
        </div>

        {/* Теги питания */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
            Питание
          </h2>
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-6 space-y-2">
            {foodTags.map((tag) => (
              <div 
                key={tag.id} 
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Utensils className="text-green-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-black">{tag.name}</div>
                  {tag.default_amount && (
                    <div className="text-xs text-gray-500">
                      {tag.default_amount} {tag.default_unit === 'g' ? 'г' : tag.default_unit === 'ml' ? 'мл' : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingFood(tag.id!);
                    setNewFoodName(tag.name);
                    setNewFoodAmount(tag.default_amount || '');
                    setNewFoodUnit(tag.default_unit || 'g');
                    setAddingFood(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => setDeleteFoodConfirm(tag.id!)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-600 opacity-0 group-hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {foodTags.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Нет сохраненного питания</p>
            )}

            <button
              onClick={() => {
                setEditingFood(null);
                setNewFoodName('');
                setNewFoodAmount('');
                setNewFoodUnit('g');
                setAddingFood(true);
              }}
              className="w-full py-3 text-sm font-medium text-gray-600 hover:text-black transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 rounded-xl"
            >
              <Plus size={16} />
              Добавить питание
            </button>
          </div>
        </div>


      </div>

      {/* Модалки подтверждения удаления */}
      <ConfirmModal
        isOpen={deleteSymptomConfirm !== null}
        title="Удалить тег симптома?"
        message="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={() => deleteSymptomConfirm !== null && handleDeleteSymptom(deleteSymptomConfirm)}
        onCancel={() => setDeleteSymptomConfirm(null)}
      />

      <ConfirmModal
        isOpen={deleteMedConfirm !== null}
        title="Удалить лекарство?"
        message="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={() => deleteMedConfirm !== null && handleDeleteMed(deleteMedConfirm)}
        onCancel={() => setDeleteMedConfirm(null)}
      />

      <ConfirmModal
        isOpen={deleteFoodConfirm !== null}
        title="Удалить питание?"
        message="Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        danger={true}
        onConfirm={() => deleteFoodConfirm !== null && handleDeleteFood(deleteFoodConfirm)}
        onCancel={() => setDeleteFoodConfirm(null)}
      />

      {/* Модалка изменения пароля */}
      <Modal 
        isOpen={changingPassword} 
        onClose={() => {
          setChangingPassword(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }} 
        title="Изменить пароль"
        maxWidth="lg"
      >
        <div className="space-y-5">
          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 6 символов"
          />

          <Input
            label="Подтвердите пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите пароль"
          />

          {passwordError && (
            <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{passwordError}</div>
          )}
        </div>

        <ModalActions
          onCancel={() => {
            setChangingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
          }}
          onSubmit={handleChangePassword}
          cancelText="Отмена"
          submitText="Сохранить"
        />
      </Modal>

      {/* Модалка добавления/редактирования лекарства */}
      <Modal
        isOpen={addingMedication}
        onClose={() => {
          setAddingMedication(false);
          setEditingMed(null);
          setNewMedName('');
          setNewMedAmount('');
          setNewMedUnit('мл');
        }}
        title={editingMed ? "Редактировать лекарство" : "Добавить лекарство"}
        maxWidth="lg"
      >
        <div className="space-y-5">
          <Input
            label="Название лекарства"
            type="text"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            placeholder="Например: Преднизолон"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Количество"
                type="text"
                value={newMedAmount}
                onChange={(e) => setNewMedAmount(e.target.value.replace('.', ','))}
                placeholder="0,3"
              />
              {/* Быстрые кнопки */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['0,3', '0,5', '1', '1,5', '2'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewMedAmount(val)}
                    className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Единица</label>
              <select
                value={newMedUnit}
                onChange={(e) => setNewMedUnit(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 appearance-none cursor-pointer"
              >
                <option value="мл">мл</option>
                <option value="мг">мг</option>
                <option value="г">г</option>
                <option value="таб">таб</option>
                <option value="капс">капс</option>
              </select>
            </div>
          </div>
        </div>

        <ModalActions
          onCancel={() => {
            setAddingMedication(false);
            setEditingMed(null);
            setNewMedName('');
            setNewMedAmount('');
            setNewMedUnit('мл');
          }}
          onSubmit={handleAddMedication}
          cancelText="Отмена"
          submitText={editingMed ? "Сохранить" : "Добавить"}
          submitDisabled={!newMedName.trim()}
        />
      </Modal>

      {/* Модалка добавления/редактирования питания */}
      <Modal
        isOpen={addingFood}
        onClose={() => {
          setAddingFood(false);
          setEditingFood(null);
          setNewFoodName('');
          setNewFoodAmount('');
          setNewFoodUnit('g');
        }}
        title={editingFood ? "Редактировать питание" : "Добавить питание"}
        maxWidth="lg"
      >
        <div className="space-y-5">
          <Input
            label="Название корма"
            type="text"
            value={newFoodName}
            onChange={(e) => setNewFoodName(e.target.value)}
            placeholder="Например: Корм, Вода"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Количество"
                type="text"
                value={newFoodAmount}
                onChange={(e) => setNewFoodAmount(e.target.value.replace('.', ','))}
                placeholder="50"
              />
              {/* Быстрые кнопки */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['25', '50', '75', '100', '150'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewFoodAmount(val)}
                    className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Единица</label>
              <select
                value={newFoodUnit}
                onChange={(e) => setNewFoodUnit(e.target.value)}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl focus:border-gray-400 focus:bg-white transition-all outline-none text-gray-900 appearance-none cursor-pointer"
              >
                <option value="g">г</option>
                <option value="ml">мл</option>
              </select>
            </div>
          </div>
        </div>

        <ModalActions
          onCancel={() => {
            setAddingFood(false);
            setEditingFood(null);
            setNewFoodName('');
            setNewFoodAmount('');
            setNewFoodUnit('g');
          }}
          onSubmit={handleAddFood}
          cancelText="Отмена"
          submitText={editingFood ? "Сохранить" : "Добавить"}
          submitDisabled={!newFoodName.trim()}
        />
      </Modal>
    </div>
  );
};
