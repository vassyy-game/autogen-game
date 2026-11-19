# AUTOGEN Telegram Worker

Минимальный Telegram webhook для существующего `@AUTOGEN_Garage_bot`. Mini App продолжает размещаться на GitHub Pages; Worker не меняет файлы или настройки Mini App. Поддерживаются личные сообщения `/start`, `/menu`, `/help`; команды отвечают inline-клавиатурой с кнопкой `🏁 Играть`, открывающей Mini App как Telegram Web App.

## Требования

- Cloudflare account с включённым Workers;
- Node.js/npm для Wrangler;
- доступ к настройкам существующего бота. Второй бот не нужен.

## Подготовка и деплой

Из корня репозитория:

```sh
npx wrangler login
npx wrangler deploy --config telegram-worker/wrangler.toml
npx wrangler secret put TELEGRAM_BOT_TOKEN --config telegram-worker/wrangler.toml
npx wrangler secret put WEBHOOK_SECRET --config telegram-worker/wrangler.toml
```

Первый деплой создаёт Worker; затем Wrangler запросит значения секретов интерактивно и применит их к Worker. `TELEGRAM_BOT_TOKEN` — токен существующего бота; `WEBHOOK_SECRET` — случайная строка из 1–256 символов `A-Z`, `a-z`, `0-9`, `_` или `-` (например, сгенерированная локально `openssl rand -hex 32`). Не передавайте значения в командной строке, не сохраняйте их в файлах и не добавляйте в Git. Worker читает только эти секреты из окружения Cloudflare.

После деплоя Cloudflare покажет HTTPS-адрес Worker. Проверка `GET https://<worker-host>/health` показывает только доступность Worker — она не подключает и не проверяет бота. Webhook endpoint: `https://<worker-host>/telegram/webhook`.

## Безопасное подключение Telegram

Подготовка Worker сама по себе **не подключает webhook**. Перед подключением:

1. Через доверенный локальный инструмент Bot API проверьте `getWebhookInfo` для существующего бота. Не вызывайте `setWebhook`, пока не выяснено, пуст ли текущий webhook или кому он принадлежит: установка заменит адрес webhook для этого же бота.
2. Установите webhook на `https://<worker-host>/telegram/webhook`, передав `secret_token`, совпадающий с Cloudflare-секретом `WEBHOOK_SECRET`. Запрос должен идти по HTTPS; не помещайте токен в репозиторий, исходники, URL страницы, логи или историю команд.
3. Зарегистрируйте `/start`, `/menu` и `/help` через `setMyCommands`. Эта настройка не требует изменения текущей кнопки меню.
4. Убедитесь, что личные команды получают ответы, кнопка `🏁 Играть` открывает существующий Mini App, а запрос без корректного заголовка `X-Telegram-Bot-Api-Secret-Token` отклоняется.

Worker намеренно не вызывает `setWebhook`, `setMyCommands` или `setChatMenuButton`. Существующую кнопку меню Telegram оставьте без изменений. Не запускайте одновременно long polling (`getUpdates`) и webhook. Лишние Telegram update-типы Worker игнорирует; webhook следует ограничить сообщениями (`message`).

## Локальная проверка

```sh
npx wrangler dev --config telegram-worker/wrangler.toml
```

Локальные значения для Wrangler при необходимости задаются в `telegram-worker/.dev.vars`; файл и его варианты исключены из Git. Не используйте настоящий токен в публичной среде разработки.
