import { Transaction, SalonConfig } from '../types';

export function exportToExcel(transactions: Transaction[], config: SalonConfig, customTitle?: string, customFilename?: string) {
  const dateStr = new Date().toISOString().split('T')[0];
  let tableHtml = `
    <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
      <thead>
        ${customTitle ? `<tr><th colspan="${7 + config.profs.length}" style="background-color: #1e293b; color: #ffffff; padding: 10px; font-size: 14px; text-align: center;">${customTitle}</th></tr>` : ''}
        <tr style="background-color: ${config.corCustom || '#2563eb'}; color: white; font-weight: bold;">
          <th style="padding: 8px;">Data</th>
          <th style="padding: 8px;">Horário</th>
          <th style="padding: 8px;">Descrição</th>
          <th style="padding: 8px;">Pagamento</th>
          <th style="padding: 8px;">Bruto (R$)</th>
          <th style="padding: 8px;">Taxa (%)</th>
          <th style="padding: 8px;">Líquido (R$)</th>
  `;

  config.profs.forEach(p => {
    tableHtml += `<th style="padding: 8px;">Comissão ${p.nome} (${p.porc}%)</th>`;
  });

  tableHtml += `
        </tr>
      </thead>
      <tbody>
  `;

  let totalGross = 0;
  let totalNet = 0;
  let activeCount = 0;
  let cancelledCount = 0;
  const profTotals = config.profs.map(() => 0);

  transactions.forEach(tx => {
    const isCancelled = Boolean(tx.deleted || tx.status === 'cancelado');
    const gross = Number(tx.grossAmount) || 0;
    const net = Number(tx.netAmount) || 0;

    if (!isCancelled) {
      totalGross += gross;
      totalNet += net;
      activeCount++;
    } else {
      cancelledCount++;
    }

    const rowBg = isCancelled ? 'background-color: #fee2e2; color: #b91c1c;' : '';
    const textStyle = isCancelled ? 'color: #dc2626; font-weight: bold;' : '';
    const strikeStyle = isCancelled ? 'color: #dc2626; text-decoration: line-through; font-weight: bold;' : '';

    tableHtml += `
      <tr style="${rowBg}">
        <td style="padding: 6px; text-align: center; ${textStyle}">${tx.date}</td>
        <td style="padding: 6px; text-align: center; ${textStyle}">${tx.time}</td>
        <td style="padding: 6px; ${textStyle}">
          ${tx.description}
          ${isCancelled ? ' <span style="background-color: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">[CANCELADO / APAGADO]</span>' : ''}
          ${tx.clientName ? `<br><small style="color: ${isCancelled ? '#b91c1c' : '#64748b'};">Cliente: ${tx.clientName}</small>` : ''}
        </td>
        <td style="padding: 6px; text-align: center; ${textStyle}">${(tx.paymentMethod || '').toUpperCase()}</td>
        <td style="padding: 6px; text-align: right; ${strikeStyle}">R$ ${gross.toFixed(2)}</td>
        <td style="padding: 6px; text-align: center; ${textStyle}">${tx.cardFeePercent}%</td>
        <td style="padding: 6px; text-align: right; ${strikeStyle}">R$ ${net.toFixed(2)}</td>
    `;

    config.profs.forEach((p, idx) => {
      const commObj = tx.commissions?.find(c => c.professionalName.toLowerCase() === p.nome.toLowerCase());
      const comm = (commObj && commObj.amount > 0) ? commObj.amount : (net * (p.porc / 100));
      if (!isCancelled) {
        profTotals[idx] += comm;
      }
      const commColor = isCancelled ? '#dc2626; text-decoration: line-through;' : '#16a34a;';
      tableHtml += `<td style="padding: 6px; text-align: right; color: ${commColor} font-weight: bold;">R$ ${comm.toFixed(2)}</td>`;
    });

    tableHtml += `</tr>`;
  });

  tableHtml += `
      </tbody>
      <tfoot>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="padding: 8px;">
            TOTAL GERAL (${activeCount} procedimentos ativos${cancelledCount > 0 ? ` | ${cancelledCount} cancelado(s)` : ''})
          </td>
          <td style="padding: 8px; text-align: right; color: #ea580c;">R$ ${totalGross.toFixed(2)}</td>
          <td></td>
          <td style="padding: 8px; text-align: right; color: #2563eb;">R$ ${totalNet.toFixed(2)}</td>
  `;

  profTotals.forEach(tot => {
    tableHtml += `<td style="padding: 8px; text-align: right; color: #16a34a;">R$ ${tot.toFixed(2)}</td>`;
  });

  tableHtml += `
        </tr>
      </tfoot>
    </table>
  `;

  if (cancelledCount > 0) {
    tableHtml += `
      <p style="font-family: Arial, sans-serif; font-size: 11px; color: #dc2626; font-weight: bold; margin-top: 8px;">
        * PROCEDIMENTOS EM VERMELHO FORAM APAGADOS/CANCELADOS: O registro e o valor original foram mantidos para conferência, porém NÃO foram somados no total final do caixa.
      </p>
    `;
  }

  const blob = new Blob(['\ufeff' + tableHtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `Fechamento_Caixa_${config.nomeSalao.replace(/\s+/g, '_')}_${dateStr}.xls`;
  a.click();
}

export function exportToWord(transactions: Transaction[], config: SalonConfig, customTitle?: string, customFilename?: string) {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const corHeader = config.corCustom || '#2563eb';

  let totalGross = 0;
  let totalNet = 0;
  let activeCount = 0;
  let cancelledCount = 0;
  const profTotals = config.profs.map(() => 0);

  const profHeaders = config.profs
    .map(p => `<th style="background-color: ${corHeader}; color: #ffffff; padding: 7px 5px; border: 1px solid #334155; text-align: center; font-size: 9pt; font-weight: bold;">${p.nome} (${p.porc}%)</th>`)
    .join('');

  let rowsHtml = '';
  if (transactions.length === 0) {
    rowsHtml = `
      <tr>
        <td colspan="${7 + config.profs.length}" style="padding: 16px; text-align: center; color: #64748b; font-size: 10pt; font-weight: bold; border: 1px solid #cbd5e1;">
          Nenhum procedimento registrado para o período solicitado.
        </td>
      </tr>
    `;
  } else {
    transactions.forEach((tx, idx) => {
      const isCancelled = Boolean(tx.deleted || tx.status === 'cancelado');
      const gross = Number(tx.grossAmount) || 0;
      const net = Number(tx.netAmount) || 0;

      if (!isCancelled) {
        totalGross += gross;
        totalNet += net;
        activeCount++;
      } else {
        cancelledCount++;
      }

      const rowBg = isCancelled ? 'background-color: #fee2e2; color: #b91c1c;' : (idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;');
      const textStyle = isCancelled ? 'color: #dc2626; font-weight: bold;' : 'color: #1e293b;';
      const strikeStyle = isCancelled ? 'color: #dc2626; text-decoration: line-through; font-weight: bold;' : 'font-weight: bold; color: #0f172a;';

      let colsProf = '';
      config.profs.forEach((p, pIdx) => {
        const commObj = tx.commissions?.find(c => c.professionalName.toLowerCase() === p.nome.toLowerCase());
        const comm = (commObj && commObj.amount > 0) ? commObj.amount : (net * (p.porc / 100));
        if (!isCancelled) {
          profTotals[pIdx] += comm;
        }
        const commColor = isCancelled ? '#dc2626; text-decoration: line-through;' : '#16a34a;';
        colsProf += `<td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: right; color: ${commColor} font-weight: bold; font-size: 9pt;">R$ ${comm.toFixed(2)}</td>`;
      });

      rowsHtml += `
        <tr style="${rowBg}">
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; ${textStyle} font-size: 9pt;">${tx.date || '-'}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; ${textStyle} font-size: 9pt;">${tx.time || '-'}</td>
          <td style="padding: 6px 6px; border: 1px solid #cbd5e1; ${textStyle} font-size: 9pt;">
            <b>${tx.description}</b>
            ${isCancelled ? ' <span style="background-color: #dc2626; color: #ffffff; padding: 2px 5px; font-size: 8pt; font-weight: bold; border-radius: 3px;">[CANCELADO]</span>' : ''}
            ${tx.clientName ? `<br><span style="color: ${isCancelled ? '#b91c1c' : '#64748b'}; font-size: 8.5pt;">Cliente: ${tx.clientName}</span>` : ''}
          </td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; ${textStyle} font-size: 9pt; font-weight: bold;">${(tx.paymentMethod || 'DINHEIRO').toUpperCase()}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: right; ${strikeStyle} font-size: 9pt;">R$ ${gross.toFixed(2)}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; ${textStyle} font-size: 9pt;">${tx.cardFeePercent > 0 ? `${tx.cardFeePercent}%` : '-'}</td>
          <td style="padding: 6px 5px; border: 1px solid #cbd5e1; text-align: right; ${strikeStyle} font-size: 9pt;">R$ ${net.toFixed(2)}</td>
          ${colsProf}
        </tr>
      `;
    });
  }

  const totProfsCols = profTotals
    .map(totP => `<td style="padding: 8px 5px; border: 1.5pt solid #334155; text-align: right; color: #16a34a; font-weight: bold; font-size: 9.5pt;">R$ ${totP.toFixed(2)}</td>`)
    .join('');

  const wordHtml = `\ufeff<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>Fechamento de Caixa - ${config.nomeSalao}</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      @page Section1 {
        size: 21.0cm 29.7cm;
        margin: 1.5cm 1.2cm 1.5cm 1.2cm;
        mso-header-margin: 1.0cm;
        mso-footer-margin: 1.0cm;
        mso-paper-source: 0;
      }
      div.Section1 { page: Section1; }
      body {
        font-family: Calibri, 'Segoe UI', Arial, sans-serif;
        font-size: 10pt;
        color: #1e293b;
        background: #ffffff;
        margin: 0;
        padding: 0;
      }
      h2 {
        color: ${corHeader};
        margin: 0 0 4px 0;
        text-align: center;
        font-size: 16pt;
        font-weight: bold;
      }
      .subtitle {
        text-align: center;
        margin: 2px 0 6px 0;
        font-size: 11pt;
        font-weight: bold;
        color: #334155;
      }
      .meta {
        text-align: center;
        margin: 2px 0 14px 0;
        font-size: 9.5pt;
        color: #64748b;
      }
      table.planilha {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        width: 100%;
        margin-top: 10px;
        border: 1.5pt solid #334155;
      }
      table.planilha th {
        background-color: ${corHeader};
        color: #ffffff;
        padding: 8px 5px;
        border: 1px solid #334155;
        font-size: 9pt;
        font-weight: bold;
        text-align: center;
      }
      table.planilha td {
        padding: 6px 5px;
        border: 1px solid #cbd5e1;
        font-size: 9pt;
      }
      .footer-row {
        background-color: #f1f5f9;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="Section1">
      <h2>${config.nomeSalao}</h2>
      <div class="subtitle">${customTitle || `Relatório de Fechamento de Caixa - ${dateStr}`}</div>
      <div class="meta">
        Procedimentos Ativos: <b>${activeCount}</b>${cancelledCount > 0 ? ` | Cancelados/Apagados: <b style="color: #dc2626;">${cancelledCount}</b>` : ''}
        &nbsp;|&nbsp; Emitido em: <b>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>
      </div>

      <table class="planilha" border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1.5pt solid #334155;">
        <thead>
          <tr style="background-color: ${corHeader};">
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Data</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Horário</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 6px; border: 1px solid #334155; font-size: 9pt; font-weight: bold; text-align: left;">Descrição / Procedimento</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Pagamento</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Bruto (R$)</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Taxa</th>
            <th style="background-color: ${corHeader}; color: #ffffff; padding: 8px 5px; border: 1px solid #334155; font-size: 9pt; font-weight: bold;">Líquido (R$)</th>
            ${profHeaders}
          </tr>
        </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="footer-row" style="background-color: #f1f5f9; font-weight: bold;">
          <td colspan="4" style="padding: 8px 6px; border: 1.5pt solid #334155; font-weight: bold; font-size: 9.5pt;">
            TOTAL DO PERÍODO (${activeCount} ativo(s)${cancelledCount > 0 ? ` | ${cancelledCount} cancelado(s)` : ''})
          </td>
          <td style="padding: 8px 5px; border: 1.5pt solid #334155; text-align: right; color: #ea580c; font-weight: bold; font-size: 9.5pt;">
            R$ ${totalGross.toFixed(2)}
          </td>
          <td style="padding: 8px 5px; border: 1.5pt solid #334155; text-align: center; font-size: 9pt;">-</td>
          <td style="padding: 8px 5px; border: 1.5pt solid #334155; text-align: right; color: #2563eb; font-weight: bold; font-size: 9.5pt;">
            R$ ${totalNet.toFixed(2)}
          </td>
          ${totProfsCols}
        </tr>
      </tfoot>
    </table>
    ${cancelledCount > 0 ? `
      <p style="text-align: left; font-size: 8.5pt; color: #dc2626; margin-top: 12px; font-weight: bold;">
        * Atenção: Procedimentos em vermelho foram cancelados/apagados pelo salão. O valor original foi mantido para fins de conferência e auditoria, porém NÃO foi contabilizado no total final do fechamento.
      </p>
    ` : ''}
      <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5pt; color: #64748b; text-align: center;">
        Relatório Oficial emitido pelo Sistema Agenda Fácil &bull; Salvo e Sincronizado no Banco de Dados
      </div>
    </div>
  </body>
  </html>`;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `Fechamento_Caixa_${config.nomeSalao.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, 1000);
}
