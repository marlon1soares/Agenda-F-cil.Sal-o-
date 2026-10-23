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

    const officialProductionUrl = 'https://agendamaisfacil.vercel.app';
    let baseClean = officialProductionUrl;
    const candidateOrigin = (req.headers['origin'] || req.headers['referer'] || '').trim();
    const candidateHost = (req.headers['host'] || '').trim();

    if (
      candidateOrigin &&
      !candidateOrigin.includes('run.app') &&
      !candidateOrigin.includes('ais-') &&
      !candidateOrigin.includes('localhost') &&
      !candidateOrigin.includes('127.0.0.1')
    ) {
      try {
        const parsed = new URL(candidateOrigin);
        baseClean = `${parsed.protocol}//${parsed.host}`;
      } catch {}
    } else if (
      candidateHost &&
      !candidateHost.includes('run.app') &&
      !candidateHost.includes('ais-') &&
      !candidateHost.includes('localhost') &&
      !candidateHost.includes('127.0.0.1')
    ) {
      const proto = req.headers['x-forwarded-proto'] || 'https';
      baseClean = `${proto}://${candidateHost}`.replace(/\/$/, '');
    }

    const cardsHtml = allMatches.map(acc => {
      const isAdm = acc.type === 'admin';
      const roleBadge = isAdm ? '👑 Conta de Administrador Geral' : `💈 ${acc.title || 'Salão Parceiro'}`;
      const directLoginUrl = `${baseClean}/?acesso-salao=1&cpf=${encodeURIComponent(acc.cpf || '')}&token=${encodeURIComponent(acc.password || '')}`;
      const resetPasswordUrl = `${baseClean}/?redefinir-senha=1&email=${encodeURIComponent(cleanEmail)}&cpf=${encodeURIComponent(acc.cpf || '')}&role=${encodeURIComponent(acc.type)}`;

      return `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #181d29; border: 1px solid #334155; border-radius: 14px; margin-bottom: 20px; text-align: left;">
          <tr>
            <td style="padding: 20px;">
              <!-- Header do Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; border-bottom: 1px solid #242c3d; padding-bottom: 12px;">
                <tr>
                  <td align="left" style="color: #fbbf24; font-weight: bold; font-size: 14px;">
                    ${roleBadge}
                  </td>
                  <td align="right" style="color: #cbd5e1; font-family: monospace; font-size: 12px; background-color: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #334155;">
                    CPF: ${acc.cpf}
                  </td>
                </tr>
              </table>

              <!-- 1. Senha / Token de Acesso Atual -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase; padding-bottom: 6px;">
                    SUA SENHA / TOKEN DE ACESSO:
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#090d16" align="center" style="background-color: #090d16; border: 1px solid #334155; border-radius: 10px; padding: 14px 18px;">
                    <span style="font-family: monospace, 'Courier New', Courier; font-size: 24px; font-weight: bold; color: #34d399; letter-spacing: 2px;">
                      ${acc.password}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- 2. Criar ou Alterar para Nova Senha -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px; border-top: 1px solid #242c3d; padding-top: 14px;">
                <tr>
                  <td style="color: #cbd5e1; font-size: 12px; font-weight: bold; padding-bottom: 8px;">
                    Criar ou alterar para nova senha (caracteres que quiser):
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#d97706" align="center" style="background-color: #d97706; border-radius: 10px;">
                    <a href="${resetPasswordUrl}" target="_blank" style="display: block; padding: 13px 18px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; font-family: Arial, sans-serif;">
                      ✨ Criar ou Alterar Nova Senha no Aplicativo ➔
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 3. Entrar no Aplicativo Agora com Esta Senha -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#059669" align="center" style="background-color: #059669; border-radius: 10px;">
                    <a href="${directLoginUrl}" target="_blank" style="display: block; padding: 14px 18px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;">
                      ✓ Entrar no Aplicativo Agora com Esta Senha ➔
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }).join('');

    const plainText = `
==============================================
AGENDA FÁCIL - RECUPERAÇÃO DE SENHA
==============================================

Olá! Localizamos seu cadastro no sistema:
E-mail: ${cleanEmail}

${allMatches.map(acc => `
----------------------------------------------
Perfil: ${acc.title || acc.role || 'Conta de Acesso'}
CPF de Login: ${acc.cpf}

SUA SENHA / TOKEN DE ACESSO ATUAL:
>>> ${acc.password} <<<

1) PARA CRIAR OU ALTERAR NOVA SENHA (qualquer caractere que desejar):
${baseClean}/?redefinir-senha=1&email=${encodeURIComponent(cleanEmail)}&cpf=${encodeURIComponent(acc.cpf || '')}&role=${encodeURIComponent(acc.type)}

2) PARA ENTRAR NO APLICATIVO AGORA COM ESTA SENHA:
${baseClean}/?acesso-salao=1&cpf=${encodeURIComponent(acc.cpf || '')}&token=${encodeURIComponent(acc.password || '')}
----------------------------------------------
`).join('\n')}

Este e-mail foi gerado automaticamente pelo robô de recuperação do Agenda Fácil.
Se você não solicitou, pode desconsiderar com total segurança.
`.trim();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - Agenda Fácil</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b101b; font-family: Arial, Helvetica, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b101b" style="background-color: #0b101b; width: 100%; margin: 0; padding: 20px 10px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background-color: #10141d; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden;">
          <tr>
            <td style="padding: 28px 20px; text-align: center;">

              <!-- Topo: Badge Cadastro Localizado -->
              <table align="center" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td bgcolor="#064e3b" style="background-color: #064e3b; border: 1px solid #059669; border-radius: 20px; padding: 6px 18px; color: #34d399; font-size: 13px; font-weight: bold;">
                    ✓ Cadastro Localizado!
                  </td>
                </tr>
              </table>

              <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0 0 6px 0; font-family: Arial, sans-serif;">
                Recuperação de Senha
              </h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 22px 0;">
                E-mail: <strong style="color: #ffffff;">${cleanEmail}</strong>
              </p>

              <!-- Cards de Acesso com a Senha e Botões -->
              ${cardsHtml}

              <!-- Rodapé -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px solid #1e293b; padding-top: 16px;">
                <tr>
                  <td align="center" style="color: #64748b; font-size: 11px; line-height: 1.5;">
                    <p style="margin: 0;">Este e-mail foi gerado automaticamente pelo robô do <strong>Agenda Fácil</strong>.</p>
                    <p style="margin: 4px 0 0 0; color: #475569;">Se você não solicitou a recuperação, pode desconsiderar esta mensagem.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
      subject: '🔑 Recuperação de Senha - Agenda Fácil',
      text: plainText,
      html: emailHtml
    });

    return res.status(200).json({
      success: true,
      emailSent: true,
      message: `Senha enviada com sucesso! O robô enviou os dados de acesso para o e-mail ${cleanEmail}! Verifique sua caixa de entrada e pasta de spam.`,
      accounts: allMatches.map(a => ({
        type: a.type,
        role: a.role,
        cpf: a.cpf,
        email: cleanEmail
      }))
    });
  } catch (err: any) {
    console.error('Erro na rota serverless de recuperação:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro ao enviar e-mail de recuperação.'
    });
  }
}
