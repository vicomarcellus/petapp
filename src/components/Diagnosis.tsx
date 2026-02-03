import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { Activity, Plus, Trash2, Calendar as CalendarIcon, FileText, Edit2, MessageSquarePlus } from 'lucide-react';
import { Diagnosis as DiagnosisType } from '../types';
import { formatDate } from '../utils';
import { ConfirmModal } from './Modal';
import { Input, Textarea } from './ui/Input';
import { Modal, ModalActions } from './ui/Modal';

interface DiagnosisNote {
    id: number;
    diagnosis_id: number;
    date: string;
    note: string;
    created_at: string;
}

export const Diagnosis = () => {
    const { currentUser, currentPetId } = useStore();
    const [diagnoses, setDiagnoses] = useState<DiagnosisType[]>([]);
    const [diagnosisNotes, setDiagnosisNotes] = useState<Record<number, DiagnosisNote[]>>({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingDiagnosis, setEditingDiagnosis] = useState<DiagnosisType | null>(null);
    const [newDiagnosis, setNewDiagnosis] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newDate, setNewDate] = useState(formatDate(new Date()));
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    
    // Note modal
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');
    const [noteDate, setNoteDate] = useState(formatDate(new Date()));

    useEffect(() => {
        if (currentUser && currentPetId) {
            loadDiagnoses();

            const channel = supabase
                .channel('diagnoses_changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'diagnoses', filter: `pet_id=eq.${currentPetId}` },
                    () => loadDiagnoses()
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'diagnosis_notes', filter: `pet_id=eq.${currentPetId}` },
                    () => loadDiagnosisNotes()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [currentUser, currentPetId]);

    const loadDiagnoses = async () => {
        if (!currentUser || !currentPetId) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('diagnoses')
                .select('*')
                .eq('pet_id', currentPetId)
                .order('date', { ascending: false });

            if (error) throw error;
            setDiagnoses(data || []);
            
            // Load notes for all diagnoses
            if (data && data.length > 0) {
                await loadDiagnosisNotes();
            }
        } catch (error) {
            console.error('Error loading diagnoses:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDiagnosisNotes = async () => {
        if (!currentUser || !currentPetId) return;

        try {
            const { data, error } = await supabase
                .from('diagnosis_notes')
                .select('*')
                .eq('pet_id', currentPetId)
                .order('date', { ascending: false });

            if (error) throw error;
            
            // Group notes by diagnosis_id
            const notesByDiagnosis: Record<number, DiagnosisNote[]> = {};
            data?.forEach(note => {
                if (!notesByDiagnosis[note.diagnosis_id]) {
                    notesByDiagnosis[note.diagnosis_id] = [];
                }
                notesByDiagnosis[note.diagnosis_id].push(note);
            });
            
            setDiagnosisNotes(notesByDiagnosis);
        } catch (error) {
            console.error('Error loading diagnosis notes:', error);
        }
    };

    const handleAddDiagnosis = async () => {
        if (!currentUser || !currentPetId || !newDiagnosis.trim()) return;

        setSaving(true);
        setSaveError(null);

        try {
            if (editingDiagnosis) {
                // Update existing diagnosis
                const { error } = await supabase
                    .from('diagnoses')
                    .update({
                        date: newDate,
                        diagnosis: newDiagnosis.trim(),
                        notes: newNotes.trim() || null
                    })
                    .eq('id', editingDiagnosis.id);

                if (error) throw error;
            } else {
                // Insert new diagnosis
                const diagnosisData = {
                    user_id: currentUser.id,
                    pet_id: currentPetId,
                    date: newDate,
                    diagnosis: newDiagnosis.trim(),
                    notes: newNotes.trim() || null
                };

                const { error } = await supabase
                    .from('diagnoses')
                    .insert(diagnosisData);

                if (error) throw error;
            }

            setShowAddModal(false);
            setEditingDiagnosis(null);
            setNewDiagnosis('');
            setNewNotes('');
            setNewDate(formatDate(new Date()));
        } catch (error: any) {
            console.error('Error saving diagnosis:', error);
            const errorMessage = error?.message || 'Ошибка при сохранении';
            const errorDetails = error?.details ? ` (${error.details})` : '';
            const errorHint = error?.hint ? ` Подсказка: ${error.hint}` : '';
            setSaveError(`${errorMessage}${errorDetails}${errorHint}`);
        } finally {
            setSaving(false);
        }
    };

    const handleEditDiagnosis = (diagnosis: DiagnosisType) => {
        setEditingDiagnosis(diagnosis);
        setNewDiagnosis(diagnosis.diagnosis);
        setNewNotes(diagnosis.notes || '');
        setNewDate(diagnosis.date);
        setShowAddModal(true);
    };

    const handleAddNote = async () => {
        if (!currentUser || !currentPetId || !selectedDiagnosisId || !noteText.trim()) return;

        setSaving(true);
        setSaveError(null);

        try {
            const { error } = await supabase
                .from('diagnosis_notes')
                .insert({
                    diagnosis_id: selectedDiagnosisId,
                    user_id: currentUser.id,
                    pet_id: currentPetId,
                    date: noteDate,
                    note: noteText.trim()
                });

            if (error) throw error;

            setShowNoteModal(false);
            setSelectedDiagnosisId(null);
            setNoteText('');
            setNoteDate(formatDate(new Date()));
        } catch (error: any) {
            console.error('Error adding note:', error);
            setSaveError(error?.message || 'Ошибка при сохранении');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        try {
            const { error } = await supabase
                .from('diagnosis_notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleDeleteDiagnosis = async (id: number) => {
        try {
            const { error } = await supabase
                .from('diagnoses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting diagnosis:', error);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-gray-400">Загрузка...</div>;
    }

    return (
        <div className="pb-28">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Диагнозы</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium shadow-sm"
                >
                    <Plus size={18} />
                    <span>Добавить</span>
                </button>
            </div>

            <div className="space-y-4">
                {diagnoses.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Activity className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">Диагнозов пока нет</p>
                        <p className="text-gray-400 text-sm mt-1">Нажмите «Добавить», чтобы внести первый диагноз</p>
                    </div>
                ) : (
                    diagnoses.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-6 shadow-sm hover:bg-white/80 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                                        <CalendarIcon size={14} />
                                        <span className="text-xs font-semibold uppercase tracking-wider">
                                            {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                                        {item.diagnosis}
                                    </h3>
                                    {item.notes && (
                                        <div className="flex items-start gap-2 bg-white/40 rounded-2xl p-4 border border-white/60 mb-3">
                                            <FileText size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                                            <p className="text-sm text-gray-600 italic leading-relaxed whitespace-pre-wrap">
                                                {item.notes}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Additional notes */}
                                    {diagnosisNotes[item.id!] && diagnosisNotes[item.id!].length > 0 && (
                                        <div className="space-y-2 mt-3">
                                            {diagnosisNotes[item.id!].map(note => (
                                                <div key={note.id} className="flex items-start gap-2 bg-blue-50/50 rounded-2xl p-3 border border-blue-100/60 group/note">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <CalendarIcon size={12} className="text-blue-400" />
                                                            <span className="text-xs text-blue-600 font-medium">
                                                                {new Date(note.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                            {note.note}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteNote(note.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover/note:opacity-100 flex-shrink-0"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Add note button */}
                                    <button
                                        onClick={() => {
                                            setSelectedDiagnosisId(item.id!);
                                            setShowNoteModal(true);
                                        }}
                                        className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        <MessageSquarePlus size={16} />
                                        Добавить заметку
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEditDiagnosis(item)}
                                        className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(item.id!)}
                                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal for adding/editing diagnosis */}
            <Modal 
                isOpen={showAddModal} 
                onClose={() => {
                    setShowAddModal(false);
                    setEditingDiagnosis(null);
                    setNewDiagnosis('');
                    setNewNotes('');
                    setNewDate(formatDate(new Date()));
                }} 
                title={editingDiagnosis ? 'Редактировать диагноз' : 'Новый диагноз'}
                maxWidth="lg"
            >
                <div className="space-y-5">
                    <Input
                        type="date"
                        label="Дата"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker()}
                    />

                    <Input
                        type="text"
                        label="Диагноз"
                        value={newDiagnosis}
                        onChange={(e) => setNewDiagnosis(e.target.value)}
                        placeholder="Напр. Хроническая болезнь почек"
                    />

                    <Textarea
                        label="Заметки (необязательно)"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Дополнительная информация от врача..."
                        rows={4}
                    />
                    {saveError && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl">
                            {saveError}
                        </div>
                    )}
                </div>

                <ModalActions
                    onCancel={() => {
                        setShowAddModal(false);
                        setEditingDiagnosis(null);
                    }}
                    onSubmit={handleAddDiagnosis}
                    cancelText="Отмена"
                    submitText="Сохранить"
                    submitDisabled={!newDiagnosis.trim()}
                    loading={saving}
                />
            </Modal>

            {/* Modal for adding note */}
            <Modal
                isOpen={showNoteModal}
                onClose={() => {
                    setShowNoteModal(false);
                    setSelectedDiagnosisId(null);
                    setNoteText('');
                    setNoteDate(formatDate(new Date()));
                }}
                title="Добавить заметку"
                maxWidth="lg"
            >
                <div className="space-y-5">
                    <Input
                        type="date"
                        label="Дата"
                        value={noteDate}
                        onChange={(e) => setNoteDate(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker()}
                    />

                    <Textarea
                        label="Заметка"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Новая информация о диагнозе..."
                        rows={4}
                    />
                    
                    {saveError && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl">
                            {saveError}
                        </div>
                    )}
                </div>

                <ModalActions
                    onCancel={() => {
                        setShowNoteModal(false);
                        setSelectedDiagnosisId(null);
                        setNoteText('');
                    }}
                    onSubmit={handleAddNote}
                    cancelText="Отмена"
                    submitText="Добавить"
                    submitDisabled={!noteText.trim()}
                    loading={saving}
                />
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirm !== null}
                title="Удалить диагноз?"
                message="Это действие нельзя отменить."
                confirmText="Удалить"
                cancelText="Отмена"
                danger={true}
                onConfirm={() => deleteConfirm !== null && handleDeleteDiagnosis(deleteConfirm)}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
};
