import { supabase } from './supabase';

/**
 * Автоматические миграции базы данных
 * Проверяет существование таблиц и показывает инструкции если нужно
 */

interface TableCheck {
  name: string;
  exists: boolean;
  required: boolean;
}

/**
 * Проверяет существование таблицы
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(0);
    
    // Если ошибка 42P01 (UNDEFINED_TABLE) - таблица не существует
    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Проверяет все необходимые таблицы
 */
async function checkTables(): Promise<TableCheck[]> {
  const tables = [
    { name: 'pets', required: true },
    { name: 'day_entries', required: true },
    { name: 'state_entries', required: true },
    { name: 'symptom_entries', required: true },
    { name: 'medication_entries', required: true },
    { name: 'feeding_entries', required: true },
    { name: 'medications', required: true },
    { name: 'symptom_tags', required: true },
    { name: 'medication_tags', required: true },
    { name: 'food_tags', required: true },
    { name: 'checklist_tasks', required: true },
    { name: 'diagnoses', required: true },
  ];

  const results: TableCheck[] = [];

  for (const table of tables) {
    const exists = await tableExists(table.name);
    results.push({
      name: table.name,
      exists,
      required: table.required,
    });
  }

  return results;
}

/**
 * Показывает красивое уведомление о необходимости миграции
 */
function showMigrationPanel(missingTables: string[]) {
  // Проверяем, показывали ли уже это уведомление
  const notificationKey = `migration_notification_${missingTables.join('_')}`;
  const notificationShown = sessionStorage.getItem(notificationKey);
  
  if (notificationShown) {
    return;
  }

  // Удаляем старые уведомления
  const oldNotification = document.getElementById('migration-notification');
  if (oldNotification) {
    oldNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'migration-notification';
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
    z-index: 10000;
    max-width: 420px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  `;

  const tablesList = missingTables.map(t => `<li style="margin: 4px 0;">📋 ${t}</li>`).join('');

  notification.innerHTML = `
    <style>
      @keyframes slideInRight {
        from {
          transform: translateX(500px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .migration-btn {
        transition: all 0.2s ease;
      }
      .migration-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .migration-btn:active {
        transform: translateY(0);
      }
    </style>
    <div style="display: flex; align-items: start; gap: 16px;">
      <div style="font-size: 32px; animation: pulse 2s infinite;">🔧</div>
      <div style="flex: 1;">
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">
          Требуется настройка базы данных
        </div>
        <div style="font-size: 14px; line-height: 1.6; opacity: 0.95; margin-bottom: 12px;">
          Обнаружены отсутствующие таблицы:
        </div>
        <ul style="font-size: 13px; margin: 12px 0; padding-left: 0; list-style: none; opacity: 0.9;">
          ${tablesList}
        </ul>
        <div style="font-size: 13px; line-height: 1.5; opacity: 0.9; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.15); border-radius: 12px;">
          💡 <strong>Это нужно сделать один раз!</strong><br/>
          Скопируйте SQL из файла и выполните в Supabase.
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a 
            href="https://supabase.com/dashboard/project/jweegvbywvixwzcliyzr/sql/new" 
            target="_blank"
            class="migration-btn"
            style="
              background: white;
              color: #667eea;
              padding: 10px 20px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              font-size: 14px;
              display: inline-block;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            "
          >
            🚀 Открыть SQL Editor
          </a>
          <button 
            onclick="
              navigator.clipboard.writeText(document.getElementById('sql-to-copy').textContent);
              this.textContent = '✅ Скопировано!';
              setTimeout(() => this.textContent = '📋 Копировать SQL', 2000);
            "
            class="migration-btn"
            style="
              background: rgba(255,255,255,0.25);
              color: white;
              border: 2px solid rgba(255,255,255,0.5);
              padding: 10px 20px;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 700;
              font-size: 14px;
            "
          >
            📋 Копировать SQL
          </button>
          <button 
            onclick="
              this.parentElement.parentElement.parentElement.parentElement.remove(); 
              sessionStorage.setItem('${notificationKey}', 'true');
            "
            class="migration-btn"
            style="
              background: rgba(255,255,255,0.15);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 600;
              font-size: 14px;
            "
          >
            ✕ Закрыть
          </button>
        </div>
        <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
          📄 SQL находится в файле: <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">DIAGNOSES_QUICK_FIX.sql</code>
        </div>
      </div>
    </div>
    <div id="sql-to-copy" style="display: none;">${getSQLForMissingTables(missingTables)}</div>
  `;

  document.body.appendChild(notification);

  // Автоматически скрыть через 60 секунд
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 60000);
}

/**
 * Возвращает SQL для создания отсутствующих таблиц
 */
function getSQLForMissingTables(tables: string[]): string {
  // Для простоты возвращаем полный SQL
  // В реальности можно было бы генерировать только нужные таблицы
  return `-- Создание таблицы diagnoses
CREATE TABLE IF NOT EXISTS public.diagnoses (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pet_id BIGINT NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnosis TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_user_pet_date ON public.diagnoses(user_id, pet_id, date);
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Users can insert own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Users can update own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Users can delete own diagnoses" ON public.diagnoses;

CREATE POLICY "Users can view own diagnoses" ON public.diagnoses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diagnoses" ON public.diagnoses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diagnoses" ON public.diagnoses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diagnoses" ON public.diagnoses FOR DELETE USING (auth.uid() = user_id);`;
}

/**
 * Запускает проверку миграций
 */
export async function runMigrations(): Promise<void> {
  console.log('🔍 Checking database tables...');

  try {
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⏭️  Skipping migrations check - user not authenticated');
      return;
    }

    // Проверяем все таблицы
    const tableChecks = await checkTables();
    const missingTables = tableChecks
      .filter(t => !t.exists && t.required)
      .map(t => t.name);

    if (missingTables.length > 0) {
      console.warn('⚠️  Missing tables:', missingTables);
      showMigrationPanel(missingTables);
    } else {
      console.log('✅ All required tables exist');
    }

  } catch (error) {
    console.error('❌ Migration check error:', error);
  }
}

/**
 * Сбрасывает флаг показа уведомления (для разработки)
 */
export function resetMigrationNotification() {
  sessionStorage.clear();
  const notification = document.getElementById('migration-notification');
  if (notification) {
    notification.remove();
  }
}

