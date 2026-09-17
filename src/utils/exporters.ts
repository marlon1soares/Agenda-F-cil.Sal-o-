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
      const comm = tx.commissions?.find(c => c.professionalName === p.nome)?.amount ?? (net * (p.porc / 100));
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

  let profHeaders = config.profs
    .map(p => `<th style="background-color: ${corHeader}; color: #ffffff; padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${p.nome} (${p.porc}%)</th>`)
    .join('');

  let rowsHtml = '';
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

    let colsProf = '';
    config.profs.forEach((p, idx) => {
      const comm = tx.commissions?.find(c => c.professionalName === p.nome)?.amount ?? (net * (p.porc / 100));
      if (!isCancelled) {
        profTotals[idx] += comm;
      }
      const commColor = isCancelled ? '#dc2626; text-decoration: line-through;' : '#16a34a;';
      colsProf += `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: ${commColor} font-weight: bold;">R$ ${comm.toFixed(2)}</td>`;
    });

    rowsHtml += `
      <tr style="${rowBg}">
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; ${textStyle}">${tx.date}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; ${textStyle}">${tx.time}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; ${textStyle}">
          ${tx.description}
          ${isCancelled ? ' <span style="background-color: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 9pt; font-weight: bold;">[CANCELADO / APAGADO]</span>' : ''}
          ${tx.clientName ? `<br><small style="color: ${isCancelled ? '#b91c1c' : '#64748b'};">Cliente: ${tx.clientName}</small>` : ''}
        </td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; ${textStyle}">${(tx.paymentMethod || '').toUpperCase()}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; ${strikeStyle}">R$ ${gross.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; ${textStyle}">${tx.cardFeePercent}%</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; ${strikeStyle}">R$ ${net.toFixed(2)}</td>
        ${colsProf}
      </tr>
    `;
  });

  let totProfsCols = profTotals
    .map(totP => `<td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #16a34a; font-weight: bold;">R$ ${totP.toFixed(2)}</td>`)
    .join('');

  const wordHtml = `\ufeff<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Fechamento de Caixa</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333333; }
      h2 { color: ${corHeader}; margin-bottom: 4px; text-align: center; }
      p { text-align: center; margin: 2px 0; font-size: 10pt; color: #64748b; }
      table { border-collapse: collapse; width: 100%; margin-top: 18px; font-size: 10pt; }
      th { background-color: ${corHeader}; color: #ffffff; padding: 8px; border: 1px solid #cbd5e1; }
      td { padding: 8px; border: 1px solid #cbd5e1; }
      .footer-row { background-color: #f1f5f9; font-weight: bold; }
    </style>
  </head>
  <body>
    <h2>${config.nomeSalao}</h2>
    <p><b>${customTitle || `Relatório de Fechamento de Caixa - ${dateStr}`}</b></p>
    <p>Procedimentos Ativos: <b>${activeCount}</b>${cancelledCount > 0 ? ` | Cancelados/Apagados: <b style="color: #dc2626;">${cancelledCount}</b>` : ''}</p>
    <table>
      <thead>
        <tr>
          <th style="background-color: ${corHeader}; color: #ffffff;">Data</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Horário</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Descrição</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Pagamento</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Bruto (R$)</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Taxa</th>
          <th style="background-color: ${corHeader}; color: #ffffff;">Líquido</th>
          ${profHeaders}
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="footer-row">
          <td colspan="4" style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">TOTAL DO DIA (${activeCount} ativo(s)${cancelledCount > 0 ? ` | ${cancelledCount} cancelado(s)` : ''})</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #ea580c; font-weight: bold;">R$ ${totalGross.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">-</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #2563eb; font-weight: bold;">R$ ${totalNet.toFixed(2)}</td>
          ${totProfsCols}
        </tr>
      </tfoot>
    </table>
    ${cancelledCount > 0 ? `
      <p style="text-align: left; font-size: 9pt; color: #dc2626; margin-top: 10px; font-weight: bold;">
        * Atenção: Procedimentos em vermelho foram cancelados/apagados pelo salão. O valor original foi registrado para conferência, porém NÃO foi contabilizado no total final do fechamento.
      </p>
    ` : ''}
  </body>
  </html>`;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = customFilename || `Fechamento_Caixa_${config.nomeSalao.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.doc`;
  a.click();
}
