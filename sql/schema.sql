-- Таблица расписаний лекарств
CREATE TABLE IF NOT EXISTS medication_schedules (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  chat_id VARCHAR(255) NOT NULL,
  pet_id INTEGER NOT NULL,
  pet_name VARCHAR(255) NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  time VARCHAR(5) NOT NULL, -- HH:mm
  start_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  color VARCHAR(50),
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON medication_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_time ON medication_schedules(time);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON medication_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_dates ON medication_schedules(start_date, days_count);

-- Таблица истории отправленных напоминаний (опционально, для аналитики)
CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES medication_schedules(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed'
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_schedule_id ON reminder_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_logs_sent_at ON reminder_logs(sent_at);
