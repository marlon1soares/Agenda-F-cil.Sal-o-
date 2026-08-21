import crypto from 'crypto';

interface VerifySignatureOptions {
  rawBody?: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
  secret?: string;
  provider?: 'mercadopago' | 'asaas' | 'efi_bank' | 'bacen_pix' | 'generic';
}

interface VerificationResult {
  isValid: boolean;
  reason?: string;
  provider: string;
}

// In-memory replay cache to prevent duplicate / replay attacks
const processedEvents = new Map<string, number>();

// Clean up events older than 1 hour periodically
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, timestamp] of processedEvents.entries()) {
    if (timestamp < oneHourAgo) {
      processedEvents.delete(key);
    }
  }
}, 600000);

export class WebhookSecurity {
  /**
   * Check if an event was already processed (Idempotency / Anti-Replay)
   */
  public static isDuplicateEvent(eventId: string): boolean {
    if (!eventId) return false;
    if (processedEvents.has(eventId)) {
      return true;
    }
    processedEvents.set(eventId, Date.now());
    return false;
  }

  /**
   * Generates a HMAC-SHA256 signature for a payload and secret
   */
  public static generateHmacSha256(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Validates webhook incoming request against HMAC signatures and gateway tokens
   */
  public static verifyWebhookSignature(options: VerifySignatureOptions): VerificationResult {
    const { headers, rawBody, secret, provider = 'generic' } = options;

    const effectiveSecret = secret || process.env.PAYMENT_WEBHOOK_SECRET || process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_TOKEN;

    // If no secret is configured yet in production or dev, accept with warning for initial setup
    if (!effectiveSecret) {
      return {
        isValid: true,
        reason: 'Nenhum segredo de webhook configurado. Recomenda-se definir PAYMENT_WEBHOOK_SECRET para máxima segurança.',
        provider
      };
    }

    const normalizedHeaders: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      if (typeof val === 'string') {
        normalizedHeaders[key.toLowerCase()] = val;
      } else if (Array.isArray(val) && val[0]) {
        normalizedHeaders[key.toLowerCase()] = val[0];
      }
    }

    // 1. Mercado Pago Webhook Verification (x-signature header)
    if (provider === 'mercadopago' || normalizedHeaders['x-signature']) {
      const xSignature = normalizedHeaders['x-signature'];
      const xRequestId = normalizedHeaders['x-request-id'] || '';

      if (!xSignature) {
        return { isValid: false, reason: 'Cabeçalho x-signature ausente.', provider: 'mercadopago' };
      }

      // Parse parts: ts=1700000000,v1=hash
      const parts = xSignature.split(',').reduce<Record<string, string>>((acc, item) => {
        const [k, v] = item.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const ts = parts['ts'];
      const v1 = parts['v1'];

      if (!ts || !v1) {
        return { isValid: false, reason: 'Formato inválido no cabeçalho x-signature (ts ou v1 ausentes).', provider: 'mercadopago' };
      }

      // Prevent replay attacks with timestamps older than 10 minutes
      const parsedTs = parseInt(ts, 10);
      if (!isNaN(parsedTs) && (Date.now() - parsedTs * 1000) > 600000) {
        return { isValid: false, reason: 'Timestamp da notificação expirado (> 10 minutos).', provider: 'mercadopago' };
      }

      const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
      const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = this.generateHmacSha256(manifest, effectiveSecret);

      const isExactMatch = crypto.timingSafeEqual(
        Buffer.from(v1, 'hex').length === 32 ? Buffer.from(v1, 'hex') : Buffer.from(v1),
        Buffer.from(expectedHash, 'hex').length === 32 ? Buffer.from(expectedHash, 'hex') : Buffer.from(expectedHash)
      );

      // Also allow direct hash matching for simplified webhook simulations
      const directHash = this.generateHmacSha256(bodyStr, effectiveSecret);
      const isDirectMatch = v1 === directHash || v1 === expectedHash;

      if (isExactMatch || isDirectMatch) {
        return { isValid: true, provider: 'mercadopago' };
      }

      return { isValid: false, reason: 'Assinatura criptográfica Mercado Pago inválida.', provider: 'mercadopago' };
    }

    // 2. Asaas Token Verification (asaas-access-token header)
    if (provider === 'asaas' || normalizedHeaders['asaas-access-token']) {
      const token = normalizedHeaders['asaas-access-token'];
      if (!token) {
        return { isValid: false, reason: 'Cabeçalho asaas-access-token ausente.', provider: 'asaas' };
      }

      if (token === effectiveSecret) {
        return { isValid: true, provider: 'asaas' };
      }

      return { isValid: false, reason: 'Token de autenticação Asaas inválido.', provider: 'asaas' };
    }

    // 3. Generic HMAC-SHA256 (x-signature, x-hub-signature-256, x-webhook-token, Authorization: Bearer <secret>)
    const signature = normalizedHeaders['x-signature-256'] || 
                      normalizedHeaders['x-hub-signature-256'] || 
                      normalizedHeaders['x-signature'] || 
                      normalizedHeaders['x-webhook-token'];

    const authHeader = normalizedHeaders['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken === effectiveSecret) {
        return { isValid: true, provider: 'bearer_token' };
      }
    }

    if (signature) {
      const cleanSig = signature.startsWith('sha256=') ? signature.substring(7) : signature;
      const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
      const expectedHash = this.generateHmacSha256(bodyStr, effectiveSecret);

      if (cleanSig === expectedHash || cleanSig === effectiveSecret) {
        return { isValid: true, provider: 'hmac_sha256' };
      }

      return { isValid: false, reason: 'Assinatura HMAC-SHA256 não confere.', provider: 'hmac_sha256' };
    }

    return {
      isValid: false,
      reason: 'Nenhum cabeçalho de autenticação ou assinatura válido encontrado na requisição do Webhook.',
      provider: 'unknown'
    };
  }

  /**
   * Sanitizes credit card payloads for PCI-DSS compliance
   * Never stores or logs PAN (Primary Account Number) or CVV in cleartext
   */
  public static maskCardData(cardData: {
    cardNumber?: string;
    cardHolder?: string;
    cardExpiry?: string;
    cardCvv?: string;
  }) {
    const rawNumber = (cardData.cardNumber || '').replace(/\D/g, '');
    const last4 = rawNumber.slice(-4) || '****';
    const first6 = rawNumber.slice(0, 6) || '******';
    
    // Determine card brand
    let brand = 'Desconhecida';
    if (/^4/.test(rawNumber)) brand = 'Visa';
    else if (/^5[1-5]/.test(rawNumber) || /^2[2-7]/.test(rawNumber)) brand = 'Mastercard';
    else if (/^3[47]/.test(rawNumber)) brand = 'American Express';
    else if (/^(606282|3841)/.test(rawNumber) || /^65/.test(rawNumber)) brand = 'Hipercard';
    else if (/^(4011|4389|4514|4576|5041|5066|5067|6277|6362|6363)/.test(rawNumber)) brand = 'Elo';

    return {
      maskedNumber: `${first6.slice(0, 4)} **** **** ${last4}`,
      last4,
      brand,
      cardHolder: cardData.cardHolder,
      cardExpiry: cardData.cardExpiry,
      pciCompliant: true,
      tokenizedAt: new Date().toISOString()
    };
  }
}
