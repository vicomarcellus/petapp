import { supabase } from './supabase.js';
import type { Pet, StateEntry, SymptomEntry, MedicationEntry, FeedingEntry } from './types.js';

// Связь Telegram ID с Supabase User ID
export async function linkTelegramUser(telegramId: number, supabaseUserId: string) {
  const { error } = await supabase
    .from('telegram_users')
    .upsert({
      telegram_id: telegramId,
      supabase_user_id: supabaseUserId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'telegram_id'
    });

  if (error) throw error;
}

// Получить Supabase User ID по Telegram ID
export async function getSupabaseUserId(telegramId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('telegram_users')
    .select('supabase_user_id')
    .eq('telegram_id', telegramId)
    .single();

  if (error || !data) return null;
  return data.supabase_user_id;
}

// Получить активного питомца
export async function getActivePet(userId: string): Promise<Pet | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Если нет активного, берём первого
    const { data: firstPet } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    return firstPet || null;
  }

  return data;
}

// Получить всех питомцев пользователя
export async function getUserPets(userId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

// Добавить запись состояния
export async function addStateEntry(entry: Omit<StateEntry, 'id' | 'created_at'>): Promise<StateEntry | null> {
  const { data, error } = await supabase
    .from('state_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error('Error adding state entry:', error);
    return null;
  }
  return data;
}

// Добавить симптом
export async function addSymptomEntry(entry: Omit<SymptomEntry, 'id' | 'created_at'>): Promise<SymptomEntry | null> {
  const { data, error } = await supabase
    .from('symptom_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error('Error adding symptom entry:', error);
    return null;
  }
  return data;
}

// Добавить лекарство
export async function addMedicationEntry(entry: Omit<MedicationEntry, 'id' | 'created_at'>): Promise<MedicationEntry | null> {
  const { data, error } = await supabase
    .from('medication_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error('Error adding medication entry:', error);
    return null;
  }
  return data;
}

// Добавить питание
export async function addFeedingEntry(entry: Omit<FeedingEntry, 'id' | 'created_at'>): Promise<FeedingEntry | null> {
  const { data, error } = await supabase
    .from('feeding_entries')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error('Error adding feeding entry:', error);
    return null;
  }
  return data;
}

// Получить записи за сегодня
export async function getTodayEntries(userId: string, petId: number) {
  const today = new Date().toISOString().split('T')[0];

  const [states, symptoms, medications, feedings] = await Promise.all([
    supabase
      .from('state_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('date', today)
      .order('timestamp', { ascending: false }),
    
    supabase
      .from('symptom_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('date', today)
      .order('timestamp', { ascending: false }),
    
    supabase
      .from('medication_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('date', today)
      .order('timestamp', { ascending: false }),
    
    supabase
      .from('feeding_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('date', today)
      .order('timestamp', { ascending: false })
  ]);

  return {
    states: states.data || [],
    symptoms: symptoms.data || [],
    medications: medications.data || [],
    feedings: feedings.data || []
  };
}

// Получить запланированные события на сегодня
export async function getTodayScheduled(userId: string, petId: number) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [medications, feedings] = await Promise.all([
    supabase
      .from('medication_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('is_scheduled', true)
      .gte('scheduled_time', todayStart.getTime())
      .lte('scheduled_time', todayEnd.getTime())
      .order('scheduled_time', { ascending: true }),
    
    supabase
      .from('feeding_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('pet_id', petId)
      .eq('is_scheduled', true)
      .gte('scheduled_time', todayStart.getTime())
      .lte('scheduled_time', todayEnd.getTime())
      .order('scheduled_time', { ascending: true })
  ]);

  return {
    medications: medications.data || [],
    feedings: feedings.data || []
  };
}
