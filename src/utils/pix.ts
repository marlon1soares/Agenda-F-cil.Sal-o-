import QRCode from 'qrcode';

/**
 * Calculates CRC16 CCITT (0xFFFF) for Pix payloads
 */
function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format string according to EMV length-value specification
 */
function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates an official BR Code / Pix EMV payload compliant with Banco Central do Brasil.
 */
export function generatePixEMVPayload(
  key: string,
  name: string = 'AGENDA FACIL',
  city: string = 'SAO PAULO',
  amount?: number
): string {
  const cleanKey = key.trim();

  // If the user already pasted a full Pix EMV code (starts with 000201)
  if (cleanKey.startsWith('000201')) {
    return cleanKey;
  }

  // Format clean key: if phone number, add +55 prefix if missing
  let formattedKey = cleanKey;
  const onlyDigits = cleanKey.replace(/\D/g, '');
  if (/^[\d\s()+-]+$/.test(cleanKey) && (onlyDigits.length === 10 || onlyDigits.length === 11)) {
    formattedKey = `+55${onlyDigits}`;
  } else if (/^\+?\d{12,14}$/.test(onlyDigits)) {
    formattedKey = cleanKey.startsWith('+') ? cleanKey : `+${onlyDigits}`;
  }

  const merchantAccountInfo = 
    emvField('00', 'br.gov.bcb.pix') +
    emvField('01', formattedKey);

  // Normalize string for EMV standard (no special acccented chars)
  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 25) || 'AGENDA FACIL';

  const cleanCity = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15) || 'SAO PAULO';

  let payload = 
    emvField('00', '01') +                          // Payload Format Indicator
    emvField('26', merchantAccountInfo) +          // Merchant Account Information - Pix
    emvField('52', '0000') +                       // Merchant Category Code
    emvField('53', '986') +                        // Transaction Currency (BRL = 986)
    (amount && amount > 0 ? emvField('54', amount.toFixed(2)) : '') + // Transaction Amount
    emvField('58', 'BR') +                         // Country Code
    emvField('59', cleanName) +                    // Merchant Name
    emvField('60', cleanCity) +                    // Merchant City
    emvField('62', emvField('05', '***'));         // Additional Data Field Template

  payload += '6304'; // CRC16 Header ID & Length

  const crc = crc16(payload);
  return payload + crc;
}

/**
 * Generates a base64 Data URL for the QR code image
 */
export async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QRCode:', err);
    // Fallback to QuickChart QR API
    return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=300&margin=1`;
  }
}
