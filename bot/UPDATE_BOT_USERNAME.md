# Обновить username бота

После создания бота в @BotFather, обнови username в коде:

## 1. В компоненте TelegramBot

Файл: `src/components/TelegramBot.tsx`

Найди строку:
```tsx
href="https://t.me/YOUR_BOT_USERNAME"
```

Замени `YOUR_BOT_USERNAME` на username твоего бота (без @):
```tsx
href="https://t.me/your_pet_health_bot"
```

И строку:
```tsx
@YOUR_BOT_USERNAME
```

Замени на:
```tsx
@your_pet_health_bot
```

## 2. В README бота (опционально)

Файл: `bot/README.md`

Обнови ссылки на бота для документации.

## Готово!

Теперь пользователи смогут открыть бота по правильной ссылке.
