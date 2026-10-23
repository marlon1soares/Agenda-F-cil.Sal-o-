import nodemailer from 'nodemailer';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const { email } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Por favor, digite um e-mail válido para a recuperação.'
      });
    }

    // Default registered administrator credentials list
    const adminAccounts = [
      {
        type: 'admin',
        role: 'Administrador Geral',
        title: '👑 Conta de Administrador Geral',
        name: 'Administrador Geral',
        cpf: '226.224.488-05',
        password: 'Ana1@@theo',
        email: 'marlon1soares28@gmail.com'
      },
      {
        type: 'admin',
        role: 'Administrador Geral',
        title: '👑 Conta de Administrador Geral',
        name: 'Administrador Geral',
        cpf: '226.224.488-05',
        password: 'Ana1@@theo',
        email: 'marlonsoares@prof.educacao.sp.gov.br'
      },
      {
        type: 'admin',
        role: 'Administrador Geral',
        title: '👑 Conta de Administrador Geral',
        name: 'Administrador Geral',
        cpf: '309.287.638-54',
        password: 'Ana1@luna',
        email: 'marlon1soares28@gmail.com'
      },
      {
        type: 'admin',
        role: 'Administrador Geral',
        title: '👑 Conta de Administrador Geral',
        name: 'Administrador Geral',
        cpf: '000.000.000-00',
        password: 'admin',
        email: 'admin@salao.com'
      },
      {
        type: 'admin',
        role: 'Administrador Geral',
        title: '👑 Conta de Administrador Geral',
        name: 'Administrador Geral',
        cpf: '123.456.789-00',
        password: 'admin',
        email: 'admin@salao.com'
      }
    ];

    const matchedAdmins = adminAccounts.filter(a => (a.email || '').toLowerCase().trim() === cleanEmail);

    // Default registered salons
    const salonAccounts = [
      {
        type: 'salao',
        role: 'Salão Parceiro',
        title: '💈 Controle Salão dos Parças',
        name: 'Marlon & Michael',
        cpf: '392.810.491-00',
        password: 'SALAO-PARCAS-2026',
        email: 'admin@salaoparcas.com'
      }
    ];

    const matchedSalons = salonAccounts.filter(s => (s.email || '').toLowerCase().trim() === cleanEmail);

    const allMatches = [...matchedAdmins, ...matchedSalons];

    // If not found in default list, still allow recovery for registered account
    if (allMatches.length === 0) {
      if (cleanEmail === 'marlon1soares28@gmail.com' || cleanEmail === 'marlonsoares@prof.educacao.sp.gov.br') {
        allMatches.push({
          type: 'admin',
          role: 'Administrador Geral',
          title: '👑 Conta de Administrador Geral',
          name: 'Administrador Geral',
          cpf: '226.224.488-05',
          password: 'Ana1@@theo',
          email: cleanEmail
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'E-mail não encontrado no sistema. Verifique o e-mail digitado ou fale com o suporte.'
        });
      }
    }

    const host = req.headers['host'] || 'agendamaisfacil.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseClean = `${proto}://${host}`;

    const cardsHtml = allMatches.map(acc => {
      const isAdm = acc.type === 'admin';
      const roleBadge = isAdm ? '👑 Conta de Administrador Geral' : `💈 ${acc.title || 'Salão Parceiro'}`;
      const directLoginUrl = `${baseClean}/?acesso-salao=1&cpf=${encodeURIComponent(acc.cpf || '')}&token=${encodeURIComponent(acc.password || '')}`;
      const resetPasswordUrl = `${baseClean}/?redefinir-senha=1&email=${encodeURIComponent(cleanEmail)}&cpf=${encodeURIComponent(acc.cpf || '')}&role=${encodeURIComponent(acc.type)}`;

      return `
        <div style="background-color: #181d29; border: 1px solid #334155; border-radius: 16px; padding: 22px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header do Card -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px; border-bottom: 1px solid #242c3d; padding-bottom: 12px;">
            <tr>
              <td align="left" style="color: #fbbf24; font-weight: 800; font-size: 14px;">
                ${roleBadge}
              </td>
              <td align="right" style="font-family: monospace; font-size: 12px; background: #0f172a; color: #cbd5e1; padding: 4px 10px; border-radius: 6px; border: 1px solid #334155;">
                CPF: ${acc.cpf}
              </td>
            </tr>
          </table>

          <!-- 1. Senha / Token de Acesso Atual -->
          <div style="margin-bottom: 18px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
              Sua Senha / Token de Acesso:
            </p>
            <div style="background-color: #090d16; border: 1px solid #334155; border-radius: 12px; padding: 14px 18px; text-align: center;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 900; color: #34d399; letter-spacing: 2px;">
                ${acc.password}
              </span>
            </div>
          </div>

          <!-- 2. Criar ou Alterar para Nova Senha -->
          <div style="margin-bottom: 18px; padding-top: 14px; border-top: 1px solid #242c3d;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8;">
              Criar ou alterar para nova senha (caracteres que quiser):
            </p>
            <a href="${resetPasswordUrl}" target="_blank" style="display: block; background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff; text-decoration: none; text-align: center; font-weight: 800; font-size: 13px; padding: 12px 18px; border-radius: 10px; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3);">
              ✨ Criar ou Alterar Nova Senha no Aplicativo ➔
            </a>
          </div>

          <!-- 3. Entrar no Aplicativo Agora com Esta Senha -->
          <div style="padding-top: 10px;">
            <a href="${directLoginUrl}" target="_blank" style="display: block; background: #059669; color: #ffffff; text-decoration: none; text-align: center; font-weight: 900; font-size: 14px; padding: 14px 20px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">
              ✓ Entrar no Aplicativo Agora com Esta Senha ➔
            </a>
          </div>
        </div>
      `;
    }).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Recuperação de Senha - Agenda Fácil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b101b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="max-width: 520px; margin: 30px auto; background-color: #10141d; border: 1px solid #1e293b; border-radius: 24px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
    
    <!-- Topo: Badge Cadastro Localizado -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #064e3b; border: 1px solid #059669; color: #34d399; font-weight: 800; font-size: 12px; padding: 6px 16px; border-radius: 9999px;">
        ✓ Cadastro Localizado!
      </div>
      <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; margin: 12px 0 4px 0; letter-spacing: -0.5px;">
        Recuperação de Senha
      </h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        E-mail: <strong style="color: #f1f5f9;">${cleanEmail}</strong>
      </p>
    </div>

    <!-- Cards de Acesso com a Senha e Botões -->
    ${cardsHtml}

    <!-- Rodapé -->
    <div style="text-align: center; border-top: 1px solid #1e293b; padding-top: 18px; margin-top: 10px;">
      <p style="margin: 0; font-size: 11px; color: #64748b;">
        Este e-mail foi gerado automaticamente pelo robô de recuperação do <strong>Agenda Fácil</strong>.
      </p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">
        Se você não solicitou a recuperação, pode desconsiderar esta mensagem com total segurança.
      </p>
    </div>

  </div>
</body>
</html>
    `;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'marlon1soares28@gmail.com',
        pass: 'jhtlugrpxbxxkrjn'
      }
    });

    await transporter.sendMail({
      from: '"Agenda Fácil" <marlon1soares28@gmail.com>',
      to: cleanEmail,
      subject: 'Recuperação de Senha - Agenda Fácil',
      html: emailHtml
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: `Senha enviada com sucesso! O robô enviou os dados de acesso para o e-mail ${cleanEmail}! Verifique sua caixa de entrada e pasta de spam.`
    });
  } catch (err: any) {
    console.error('Erro na rota serverless de recuperação:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro ao enviar e-mail de recuperação.'
    });
  }
}
