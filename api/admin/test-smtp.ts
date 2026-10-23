import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { smtpUser, smtpPass, recipient } = req.body || {};
    const user = (smtpUser || 'marlon1soares28@gmail.com').trim();
    const pass = (smtpPass || 'jhtlugrpxbxxkrjn').trim().replace(/\s+/g, '');
    const targetRecipient = (recipient || user).trim();

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Agenda Fácil Robô" <${user}>`,
      to: targetRecipient,
      subject: '🤖 Teste do Robô de E-mail - Agenda Fácil',
      html: `
        <div style="background-color: #0b1222; color: #fff; padding: 24px; border-radius: 16px; font-family: sans-serif; border: 1px solid #1e293b;">
          <h2 style="color: #34d399; margin-top: 0;">✓ Robô de E-mail Conectado com Sucesso!</h2>
          <p>Este é um e-mail de teste automático confirmando que a sua <strong>Senha de Aplicativo Google</strong> está 100% ativa e funcionando.</p>
          <p>A partir de agora, qualquer usuário ou salão que esquecer a senha receberá os e-mails instantaneamente em sua caixa de entrada.</p>
          <hr style="border: 0; border-top: 1px solid #1e293b; margin: 18px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Remetente autorizado: ${user} | Data/Hora: ${new Date().toLocaleString("pt-BR")}</p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `✓ E-mail de teste enviado com sucesso para ${targetRecipient}! A conexão foi autorizada pelo Google.`
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: `Erro ao enviar e-mail de teste: ${err.message}`
    });
  }
}
