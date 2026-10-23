import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, cpf, newPassword, accountType } = req.body || {};
    const cleanPassword = (newPassword || '').trim();
    const cleanCpf = (cpf || '').replace(/\D/g, '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanPassword || cleanPassword.length < 1) {
      return res.status(400).json({ success: false, error: 'Por favor, digite a nova senha desejada.' });
    }

    // Attempt to persist to sync-database.json if running with persistent filesystem
    try {
      const dbPath = path.resolve(process.cwd(), 'data/sync-database.json');
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(raw);

        if (accountType === 'admin') {
          if (dbData.adminCredentials) {
            dbData.adminCredentials.password = cleanPassword;
            if (cleanCpf) dbData.adminCredentials.cpf = cpf;
            if (cleanEmail) dbData.adminCredentials.email = cleanEmail;
          }
          if (Array.isArray(dbData.adminCredentialsList)) {
            for (let i = 0; i < dbData.adminCredentialsList.length; i++) {
              const itemCpfClean = (dbData.adminCredentialsList[i].cpf || '').replace(/\D/g, '').trim();
              const itemEmail = (dbData.adminCredentialsList[i].email || '').toLowerCase().trim();
              if ((cleanCpf && itemCpfClean === cleanCpf) || (cleanEmail && itemEmail === cleanEmail)) {
                dbData.adminCredentialsList[i].password = cleanPassword;
              }
            }
          }
        } else if (Array.isArray(dbData.salons)) {
          const idx = dbData.salons.findIndex((s: any) => {
            const sCpfClean = (s.ownerCpf || '').replace(/\D/g, '').trim();
            const sEmail = (s.ownerEmail || s.config?.email || '').toLowerCase().trim();
            return (cleanCpf && sCpfClean === cleanCpf) || (cleanEmail && sEmail === cleanEmail);
          });
          if (idx >= 0) {
            dbData.salons[idx].purchaseToken = cleanPassword;
            dbData.salons[idx].token = cleanPassword;
          }
        }
        dbData.lastUpdated = Date.now();
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
      }
    } catch (diskErr) {
      console.warn('[UPDATE PASSWORD DISK LOG]:', diskErr);
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

