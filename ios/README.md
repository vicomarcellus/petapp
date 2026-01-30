# Pet Health App - iOS Native

Нативное iOS приложение для отслеживания здоровья питомцев.

## Как создать проект

1. **Открой Xcode**
2. **File → New → Project**
3. **Выбери:** iOS → App
4. **Настрой:**
   - Product Name: `PetHealthApp`
   - Interface: **SwiftUI**
   - Language: **Swift**
5. **Сохрани в:** `kent_tracker/ios/`
6. **Добавь файлы из папки `Source/`:**
   - Перетащи все файлы и папки из `ios/Source/` в проект Xcode
   - Выбери "Copy items if needed"
   - Удали стандартные файлы которые Xcode создал

## Структура исходников

Все файлы находятся в `ios/Source/`:

```
Source/
├── Models/
│   ├── Pet.swift
│   └── Entry.swift
├── Views/
│   ├── CalendarView.swift
│   ├── AnalyticsView.swift
│   ├── AIChat.swift
│   └── SettingsView.swift
├── Services/
│   ├── SupabaseService.swift
│   └── OpenAIService.swift
├── ContentView.swift
└── PetHealthAppApp.swift
```

## Конфигурация

### Supabase
В `Services/SupabaseService.swift`:
```swift
private let supabaseURL = "твой_url"
private let supabaseKey = "твой_ключ"
```

### OpenAI
В `Services/OpenAIService.swift`:
```swift
private let apiKey = "твой_ключ"
```

## Зависимости (опционально)

Через Swift Package Manager добавь:
- `https://github.com/supabase/supabase-swift`

## Дизайн

- Glassmorphism эффекты
- Серо-бежевый градиент
- Системный шрифт SF Pro (похож на Urbanist)
- Скругления 20-32px

## Что реализовано

- ✅ Календарь с выбором даты
- ✅ Базовая аналитика
- ✅ AI Чат (UI)
- ✅ Настройки (UI)
- ✅ Модели данных
- ✅ Сервисы (заглушки)

## TODO

- [ ] Интеграция с Supabase
- [ ] Формы добавления записей
- [ ] Авторизация
- [ ] Уведомления
- [ ] Графики
