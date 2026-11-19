const MINI_APP_URL = "https://vassyy-game.github.io/autogen-game/";
const WEBHOOK_PATH = "/telegram/webhook";
const TELEGRAM_SECRET_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

const replies = {
  start: "Добро пожаловать в AUTOGEN Garage! Собирай автомобили и выходи на старт.",
  menu: "AUTOGEN Garage — выбери действие:",
  help: "Команды AUTOGEN Garage:\n/start — приветствие и запуск игры\n/menu — главное меню\n/help — эта справка",
  unknown: "Неизвестная команда. Используй /menu или /help."
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "worker-available" });
    }

    if (url.pathname !== WEBHOOK_PATH) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST" }
      });
    }

    if (!isTelegramSecret(env.WEBHOOK_SECRET)) {
      return new Response("Webhook is not configured", { status: 503 });
    }

    const suppliedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (!await secretsMatch(suppliedSecret, env.WEBHOOK_SECRET)) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (typeof env.TELEGRAM_BOT_TOKEN !== "string" || env.TELEGRAM_BOT_TOKEN.length === 0) {
      return new Response("Bot is not configured", { status: 503 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!update || typeof update !== "object" || Array.isArray(update)) {
      return new Response("Invalid update", { status: 400 });
    }

    const message = update?.message;
    const chat = message?.chat;
    if (
      chat?.type !== "private" ||
      !isValidChatId(chat.id) ||
      typeof message.text !== "string"
    ) {
      return new Response("OK");
    }

    const command = message.text.trim().match(/^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?(?:\s|$)/i)?.[1]?.toLowerCase();
    if (!command) {
      return new Response("OK");
    }

    let telegramResponse;
    let telegramResult;
    try {
      telegramResponse = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(env.TELEGRAM_BOT_TOKEN)}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chat.id,
            text: replies[command] || replies.unknown,
            reply_markup: {
              inline_keyboard: [[
                { text: "🏁 Играть", web_app: { url: MINI_APP_URL } }
              ]]
            }
          })
        }
      );

      if (!telegramResponse.ok) {
        return new Response("Telegram API request failed", { status: 502 });
      }

      telegramResult = await telegramResponse.json();
    } catch {
      return new Response("Telegram API request failed", { status: 502 });
    }

    if (telegramResult?.ok !== true) {
      return new Response("Telegram API rejected the message", { status: 502 });
    }

    return new Response("OK");
  }
};

function isValidChatId(value) {
  return (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && /^-?\d{1,20}$/.test(value));
}

function isTelegramSecret(value) {
  return typeof value === "string" && TELEGRAM_SECRET_PATTERN.test(value);
}

async function secretsMatch(supplied, expected) {
  if (!isTelegramSecret(supplied) || !isTelegramSecret(expected)) {
    return false;
  }

  const encoder = new TextEncoder();
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;

  for (let index = 0; index < suppliedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
}
