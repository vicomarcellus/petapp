# Создание iOS проекта

Xcode проект нельзя создать вручную, нужно использовать Xcode.

## Шаги:

1. **Открой Xcode**

2. **File → New → Project**

3. **Выбери шаблон:**
   - iOS → App
   - Нажми Next

4. **Настройки проекта:**
   - Product Name: `PetHealthApp`
   - Team: (твой Apple ID или оставь пустым)
   - Organization Identifier: `com.yourcompany`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Storage: **None** (не нужен Core Data пока)
   - Include Tests: можно снять галочки
   - Нажми Next

5. **Сохрани проект:**
   - Выбери папку `kent_tracker/ios/`
   - Нажми Create

6. **Скопируй файлы:**
   После создания проекта, скопируй готовые файлы из папок:
   - `Models/` → в проект
   - `Views/` → в проект
   - `Services/` → в проект

7. **Добавь файлы в проект:**
   - Перетащи папки Models, Views, Services в Xcode
   - Выбери "Copy items if needed"
   - Выбери "Create groups"

8. **Удали стандартные файлы:**
   - Удали `ContentView.swift` (у нас свой)
   - Оставь только `PetHealthAppApp.swift`

## Альтернатива: Использовать готовые файлы

Я создал все файлы кода. Просто создай пустой проект в Xcode и добавь их.

Все файлы готовы в папках:
- `ios/PetHealthApp/Models/`
- `ios/PetHealthApp/Views/`
- `ios/PetHealthApp/Services/`
