import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { Note, NoteTag, NOTE_COLORS } from '../types';
import { Bookmark, Plus, Pencil, Trash2, Search, X, Tag } from 'lucide-react';
import { Input, Textarea } from './ui/Input';
import { Modal, ModalActions } from './ui/Modal';
import { FileUpload } from './ui/FileUpload';
import { uploadAttachment, deleteAttachment } from '../services/storage';

export default function Notes() {
  const { currentPetId } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<NoteTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_pinned: false,
    selectedTags: [] as number[],
  });
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(NOTE_COLORS[0]);
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [noteFile, setNoteFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentPetId) {
      loadNotes();
      loadTags();
    }
  }, [currentPetId]);

  const loadTags = async () => {
    if (!currentPetId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('note_tags')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('pet_id', currentPetId)
        .order('name', { ascending: true });

      if (error) throw error;
      setAllTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadNotes = async () => {
    if (!currentPetId) return;

    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Загружаем заметки
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('pet_id', currentPetId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (notesError) throw notesError;

      // Загружаем теги для каждой заметки
      const notesWithTags = await Promise.all(
        (notesData || []).map(async (note) => {
          const { data: relations } = await supabase
            .from('note_tag_relations')
            .select('tag_id')
            .eq('note_id', note.id);

          if (relations && relations.length > 0) {
            const tagIds = relations.map((r) => r.tag_id);
            const { data: tags } = await supabase
              .from('note_tags')
              .select('*')
              .in('id', tagIds);

            return { ...note, tags: tags || [] };
          }

          return { ...note, tags: [] };
        })
      );

      setNotes(notesWithTags);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!currentPetId || !newTagName.trim()) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('note_tags')
        .insert({
          user_id: user.user.id,
          pet_id: currentPetId,
          name: newTagName.trim(),
          color: newTagColor,
        })
        .select()
        .single();

      if (error) throw error;

      setAllTags([...allTags, data]);
      setFormData({ ...formData, selectedTags: [...formData.selectedTags, data.id!] });
      setNewTagName('');
      setNewTagColor(NOTE_COLORS[0]);
      setShowNewTagForm(false);
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('Удалить тег? Он будет удален из всех заметок.')) return;

    try {
      const { error } = await supabase.from('note_tags').delete().eq('id', tagId);

      if (error) throw error;

      setAllTags(allTags.filter((t) => t.id !== tagId));
      setFormData({
        ...formData,
        selectedTags: formData.selectedTags.filter((id) => id !== tagId),
      });
      await loadNotes();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const handleSave = async () => {
    if (!currentPetId || !formData.title.trim()) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      let uploadResult = null;
      
      // Upload file if selected
      if (noteFile) {
        uploadResult = await uploadAttachment(
          noteFile,
          user.user.id,
          currentPetId,
          'note'
        );
      }

      let noteId: number;

      if (editingNote?.id) {
        // Delete old attachment if replacing
        if (uploadResult && editingNote.attachment_url) {
          await deleteAttachment(editingNote.attachment_url);
        }

        // Обновление
        const updateData: any = {
          title: formData.title,
          content: formData.content,
          is_pinned: formData.is_pinned,
        };

        if (uploadResult) {
          updateData.attachment_url = uploadResult.url;
          updateData.attachment_type = uploadResult.type;
          updateData.attachment_name = uploadResult.name;
        }

        const { error } = await supabase
          .from('notes')
          .update(updateData)
          .eq('id', editingNote.id);

        if (error) throw error;
        noteId = editingNote.id;
      } else {
        // Создание
        const insertData: any = {
          user_id: user.user.id,
          pet_id: currentPetId,
          title: formData.title,
          content: formData.content,
          is_pinned: formData.is_pinned,
        };

        if (uploadResult) {
          insertData.attachment_url = uploadResult.url;
          insertData.attachment_type = uploadResult.type;
          insertData.attachment_name = uploadResult.name;
        }

        const { data, error } = await supabase
          .from('notes')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        noteId = data.id!;
      }

      // Обновляем теги
      // Удаляем старые связи
      await supabase.from('note_tag_relations').delete().eq('note_id', noteId);

      // Добавляем новые связи
      if (formData.selectedTags.length > 0) {
        const relations = formData.selectedTags.map((tagId) => ({
          note_id: noteId,
          tag_id: tagId,
        }));

        await supabase.from('note_tag_relations').insert(relations);
      }

      await loadNotes();
      closeModal();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDelete = async (noteId: number, attachmentUrl?: string) => {
    if (!confirm('Удалить заметку?')) return;

    try {
      // Delete attachment if exists
      if (attachmentUrl) {
        await deleteAttachment(attachmentUrl);
      }

      const { error } = await supabase.from('notes').delete().eq('id', noteId);

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);

      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content,
        is_pinned: note.is_pinned || false,
        selectedTags: note.tags?.map((t) => t.id!) || [],
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        is_pinned: false,
        selectedTags: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      is_pinned: false,
      selectedTags: [],
    });
    setShowNewTagForm(false);
    setNewTagName('');
    setNoteFile(null);
  };

  const toggleTag = (tagId: number) => {
    if (formData.selectedTags.includes(tagId)) {
      setFormData({
        ...formData,
        selectedTags: formData.selectedTags.filter((id) => id !== tagId),
      });
    } else {
      setFormData({
        ...formData,
        selectedTags: [...formData.selectedTags, tagId],
      });
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!currentPetId) {
    return (
      <div className="pb-28">
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm p-8 text-center">
          <p className="text-gray-600">Выберите питомца</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Заметки</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-medium shadow-sm"
        >
          <Plus size={18} />
          <span>Добавить</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Поиск по заметкам и тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/60 backdrop-blur-md border border-white/80 rounded-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-gray-900 relative"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] p-12 text-center">
          <p className="text-gray-500 font-medium">
            {searchQuery ? 'Заметки не найдены' : 'Заметок пока нет'}
          </p>
          {!searchQuery && (
            <p className="text-gray-400 text-sm mt-1">
              Нажмите «Добавить», чтобы создать первую заметку
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[32px] shadow-sm hover:bg-white/80 transition-all p-6 relative group"
            >
              {/* Pin indicator */}
              {note.is_pinned && (
                <div className="absolute top-4 right-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                </div>
              )}

              {/* Content */}
              <div className="pr-8 mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">
                  {note.title}
                </h3>
                <p className="text-gray-600 text-sm line-clamp-4 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="text-xs text-gray-400">
                  {new Date(note.updated_at || note.created_at!).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  •{' '}
                  {new Date(note.updated_at || note.created_at!).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(note)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id!, note.attachment_url)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={editingNote ? 'Редактировать заметку' : 'Новая заметка'}
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Title */}
          <Input
            label="Заголовок"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Введите заголовок..."
            autoFocus
          />

          {/* Content */}
          <Textarea
            label="Текст заметки"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Введите текст заметки..."
            rows={8}
          />

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
              Теги
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id!)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    formData.selectedTags.includes(tag.id!)
                      ? 'text-white ring-2 ring-offset-2 ring-gray-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    formData.selectedTags.includes(tag.id!)
                      ? { backgroundColor: tag.color }
                      : {}
                  }
                >
                  {tag.name}
                  {formData.selectedTags.includes(tag.id!) && (
                    <X
                      size={14}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id!);
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* New Tag Form */}
            {showNewTagForm ? (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <Input
                  placeholder="Название тега..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newTagColor === color
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewTagForm(false);
                      setNewTagName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="flex-1 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    Создать
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewTagForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus size={16} />
                Создать новый тег
              </button>
            )}
          </div>

          {/* Pin */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
            <input
              type="checkbox"
              id="pin"
              checked={formData.is_pinned}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              className="w-5 h-5 text-yellow-500 rounded focus:ring-2 focus:ring-yellow-500"
            />
            <label htmlFor="pin" className="text-sm font-medium text-gray-700 cursor-pointer">
              Закрепить заметку
            </label>
          </div>

          {/* File Upload */}
          <FileUpload
            onFileSelect={(file) => setNoteFile(file)}
            currentAttachment={editingNote?.attachment_url ? {
              url: editingNote.attachment_url,
              type: editingNote.attachment_type!,
              name: editingNote.attachment_name!
            } : null}
            onRemove={() => setNoteFile(null)}
          />
        </div>

        <ModalActions
          onCancel={closeModal}
          onSubmit={handleSave}
          cancelText="Отмена"
          submitText={editingNote ? 'Сохранить' : 'Создать'}
          submitDisabled={!formData.title.trim()}
        />
      </Modal>
    </div>
  );
}
