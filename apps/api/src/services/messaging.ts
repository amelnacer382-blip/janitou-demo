import type { DbOutboundMessage } from '../data/mock-db.js';
import { normalizePhone } from './pin.js';

export interface MessagingConfig {
  whatsappToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappTemplateName?: string;
  whatsappTemplateLang: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;
  defaultCountryCode: string;
}

function config(): MessagingConfig {
  return {
    whatsappToken: process.env.WHATSAPP_CLOUD_TOKEN,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME,
    whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'ar',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFrom: process.env.TWILIO_FROM_NUMBER,
    defaultCountryCode: process.env.MESSAGING_DEFAULT_COUNTRY_CODE || '213',
  };
}

export function isWhatsAppConfigured(): boolean {
  const value = config();
  return Boolean(value.whatsappToken && value.whatsappPhoneNumberId);
}

export function isSmsConfigured(): boolean {
  const value = config();
  return Boolean(value.twilioAccountSid && value.twilioAuthToken && value.twilioFrom);
}

export function isMessagingConfigured(): boolean {
  return isWhatsAppConfigured() || isSmsConfigured();
}

function toE164(phone: string): string {
  const digits = normalizePhone(phone);
  const country = normalizePhone(config().defaultCountryCode);
  if (!digits) return '';
  if (digits.startsWith(country)) return `+${digits}`;
  if (digits.startsWith('0')) return `+${country}${digits.slice(1)}`;
  return `+${country}${digits}`;
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const value = config();
  if (!value.whatsappToken || !value.whatsappPhoneNumberId) {
    throw new Error('WHATSAPP_NOT_CONFIGURED');
  }
  const payload = value.whatsappTemplateName
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: value.whatsappTemplateName,
          language: { code: value.whatsappTemplateLang },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: body }],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: false, body },
      };
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(value.whatsappPhoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${value.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`WHATSAPP_${response.status}: ${detail.slice(0, 200)}`);
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const value = config();
  if (!value.twilioAccountSid || !value.twilioAuthToken || !value.twilioFrom) {
    throw new Error('SMS_NOT_CONFIGURED');
  }
  const credentials = Buffer.from(
    `${value.twilioAccountSid}:${value.twilioAuthToken}`
  ).toString('base64');
  const form = new URLSearchParams({
    To: to,
    From: value.twilioFrom,
    Body: body,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(value.twilioAccountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`SMS_${response.status}: ${detail.slice(0, 200)}`);
  }
}

export async function sendOutboundMessage(
  message: DbOutboundMessage
): Promise<'WHATSAPP' | 'SMS'> {
  const to = toE164(message.to);
  if (!to) throw new Error('INVALID_PHONE');
  if (message.channel === 'SMS') {
    if (isSmsConfigured()) {
      await sendSms(to, message.body);
      return 'SMS';
    }
    if (isWhatsAppConfigured()) {
      await sendWhatsApp(to, message.body);
      return 'WHATSAPP';
    }
    throw new Error('SMS_NOT_CONFIGURED');
  }
  if (isWhatsAppConfigured()) {
    await sendWhatsApp(to, message.body);
    return 'WHATSAPP';
  }
  if (isSmsConfigured()) {
    await sendSms(to, message.body);
    return 'SMS';
  }
  throw new Error('WHATSAPP_NOT_CONFIGURED');
}

export function startMessagingDispatcher(
  store: {
    getQueuedOutboundMessages: (limit?: number) => DbOutboundMessage[];
    markOutboundMessage: (
      id: string,
      status: DbOutboundMessage['status'],
      error?: string
    ) => void;
  },
  intervalMs = 15_000
): () => void {
  if (!isMessagingConfigured()) {
    console.log('[MESSAGING] WhatsApp/SMS providers not configured; outbox stays queued.');
    return () => undefined;
  }
  let running = false;
  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const messages = store.getQueuedOutboundMessages(10);
      for (const message of messages) {
        try {
          await sendOutboundMessage(message);
          store.markOutboundMessage(message.id, 'SENT');
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const attempts = message.attempts + 1;
          store.markOutboundMessage(
            message.id,
            attempts >= 5 || detail.endsWith('_NOT_CONFIGURED') ? 'FAILED' : 'QUEUED',
            detail.slice(0, 300)
          );
        }
      }
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
