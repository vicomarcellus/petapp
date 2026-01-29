import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Edit3, Check, X } from 'lucide-react';
import { SYMPTOM_COLORS } from '../types';
import { PetManager } from './PetManager';
import { Header } from './Header';
import { ConfirmModal } from './Modal';
import type { SymptomTag, MedicationTag } from '../types';

export const Settings = () => {
  const { currentUser, currentPetId } = useStore();
  const [editingSymptom, setEditingSymptom] = useState<number | null>(null);
  const [editingMed, setEditingMed] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const [symptomTags, setSymptomTags] = useState<SymptomTag[]>([]);
  const [medicationTags, setMedicationTags] = useState<MedicationTag[]>([]);
  const [deleteSymptomConfirm, setDeleteSymptomConfirm] = useState<number | null>(null);
  const [deleteMedConfirm, setDeleteMedConfirm] = useState<number | null>(null);

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

      return () => {
        supabase.removeChannel(symptomChannel);
        supabase.removeChannel(medChannel);
      };
    }
  }, [currentUser, currentPetId]);

  const loadTags = async () => {
    if (!currentUser || !currentPetId) return;
    
    try {
      const [symptomsRes, medsRes] = await Promise.all([
        supabase
          .from('symptom_tags')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId),
        supabase
          .from('medication_tags')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('pet_id', currentPetId)
      ]);

      if (symptomsRes.data) setSymptomTags(symptomsRes.data);
      if (medsRes.data) setMedicationTags(medsRes.data);
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

  const handleSaveMed = async () => {
    if (editingMed && editName.trim()) {
      try {
        const { error } = await supabase
          .from('medication_tags')
          .update({ name: editName.trim(), color: editColor })
          .eq('id', editingMed);

        if (error) throw error;
        
        setEditingMed(null);
        setEditName('');
        setEditColor('');
      } catch (error) {
        console.error('Error updating medication tag:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingSymptom(null);
    setEditingMed(null);
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
    } catch (error) {
      console.error('Error deleting medication tag:', error);
    }
  };

  const handleEditSymptom = (id: number, name: string, color: string) => {
    setEditingSymptom(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleEditMed = (id: number, name: string, color: string) => {
    setEditingMed(id);
    setEditName(name);
    setEditColor(color);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 md:p-4 pb-28">
      <div className="max-w-5xl mx-auto">
        <Header />

        <div className="space-y-4">
          {/* Профиль пользователя */}
          {currentUser && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
                Профиль
              </h2>
              <div className="bg-white rounded-2xl p-4 space-y-3">
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
                ) : (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Новый пароль
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black transition-all text-sm outline-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Подтвердите пароль
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите пароль"
                        className="w-full px-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black transition-all text-sm outline-none"
                      />
                    </div>
                    
                    {passwordError && (
                      <div className="text-xs text-red-600">{passwordError}</div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => {
                          setChangingPassword(false);
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError('');
                        }}
                        className="px-4 py-2 bg-gray-100 text-black rounded-full hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
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
              <div className="bg-white rounded-2xl p-3 space-y-1.5">
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
                              className={`w-7 h-7 rounded-full transition-all ${
                                editColor === color ? 'ring-2 ring-black scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveSymptom}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            <Check size={14} />
                            Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all">
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
          {medicationTags.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide px-1">
                Теги лекарств
              </h2>
              <div className="bg-white rounded-2xl p-3 space-y-1.5">
                {medicationTags.map((tag) => (
                  <div key={tag.id}>
                    {editingMed === tag.id ? (
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
                              className={`w-7 h-7 rounded-full transition-all ${
                                editColor === color ? 'ring-2 ring-black scale-110' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveMed}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            <Check size={14} />
                            Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-2 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <div className="flex-1 font-medium text-sm text-black">
                          {tag.name}
                        </div>
                        <button
                          onClick={() => handleEditMed(tag.id!, tag.name, tag.color)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-all text-gray-600"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteMedConfirm(tag.id!)}
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
        </div>

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
          title="Удалить тег лекарства?"
          message="Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          danger={true}
          onConfirm={() => deleteMedConfirm !== null && handleDeleteMed(deleteMedConfirm)}
          onCancel={() => setDeleteMedConfirm(null)}
        />
      </div>
    </div>
  );
};
