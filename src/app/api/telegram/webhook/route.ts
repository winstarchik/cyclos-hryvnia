import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  message?: {
    chat?: {
      id?: number;
    };
    text?: string;
  };
}

function getMiniAppUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_TMA_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://cyclos-hryvnia.vercel.app";

  const url = new URL(configuredUrl);
  if (!url.pathname || url.pathname === "/") {
    url.pathname = "/ua";
  }

  return url.toString();
}

async function sendTelegramMessage(chatId: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }

  const miniAppUrl = getMiniAppUrl();

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      text: "Cyclos Hryvnia відкривається прямо в Telegram. Натисніть кнопку нижче, щоб перейти до гаманця.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Відкрити Cyclos Wallet",
              web_app: {
                url: miniAppUrl,
              },
            },
          ],
        ],
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "telegram-webhook",
    miniAppUrl: getMiniAppUrl(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const chatId = update.message?.chat?.id;

    if (typeof chatId === "number") {
      await sendTelegramMessage(chatId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Telegram webhook error", error);
    }

    return NextResponse.json({ ok: true });
  }
}
