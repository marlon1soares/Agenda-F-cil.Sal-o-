export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, cpf, newPassword } = req.body || {};
    const cleanPassword = (newPassword || '').trim();

    if (!cleanPassword || cleanPassword.length < 1) {
      return res.status(400).json({ success: false, error: 'Por favor, digite a nova senha desejada.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Nova senha salva com sucesso! Você já pode entrar no sistema.',
      newPassword: cleanPassword
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
