/**
 * Utility to generate Microsoft Word (.doc) formatted documents and handle printouts
 * for employee schedules and commission closing (fechamento).
 */

export interface ScheduleItemExport {
  time: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  price?: number;
  status: string;
  notes?: string;
}

export interface FechamentoItemExport {
  date: string;
  time: string;
  clientName: string;
  serviceName: string;
  grossAmount: number;
  commissionAmount: number;
}

export interface FechamentoSummaryExport {
  totalClients: number;
  totalDaysWorked: number;
  grossAmount: number;
  commissionPercent: number;
  netCommission: number;
  periodLabel: string;
}

/**
 * Downloads a formatted Word (.doc) document for an employee's daily schedule.
 */
export function downloadDailyScheduleWord(
  salonName: string,
  profName: string,
  dateStr: string,
  items: ScheduleItemExport[]
) {
  const [year, month, day] = dateStr.split('-');
  const formattedDate = `${day}/${month}/${year}`;
  const totalAgendados = items.filter(i => i.status === 'agendado' || i.status === 'concluido').length;
  const valorTotalPrevisto = items.reduce((acc, curr) => acc + (curr.price || 0), 0);

  const tableRows = items.map((item, idx) => {
    const isBooked = item.status === 'agendado' || item.status === 'concluido';
    const statusLabel = item.status === 'concluido' ? 'Concluído' : item.status === 'agendado' ? 'Agendado' : item.status === 'bloqueado' ? 'Bloqueado' : 'Livre';
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; text-align: center; font-family: Arial, sans-serif; font-size: 13px;">${item.time}</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: ${item.status === 'agendado' ? '#0284c7' : item.status === 'concluido' ? '#16a34a' : item.status === 'bloqueado' ? '#dc2626' : '#64748b'}; font-weight: bold;">
          ${statusLabel}
        </td>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold;">
          ${item.clientName || (item.status === 'bloqueado' ? (item.notes || 'Horário Bloqueado') : '-')}
          ${item.clientPhone ? `<br/><span style="font-size: 11px; font-weight: normal; color: #64748b;">📞 ${item.clientPhone}</span>` : ''}
        </td>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 13px;">
          ${item.serviceName || '-'}
        </td>
        <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold;">
          ${item.price ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : '-'}
        </td>
      </tr>
    `;
  }).join('');

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Agenda do Dia - ${profName}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 20px; }
        h1 { color: #0f172a; font-size: 22px; margin-bottom: 4px; }
        h2 { color: #2563eb; font-size: 16px; margin-top: 0; margin-bottom: 16px; }
        .card { background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
        .summary-box { display: table; width: 100%; margin-bottom: 16px; }
        .summary-item { display: table-cell; padding: 8px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #1e293b; color: #ffffff; padding: 10px; border: 1px solid #0f172a; text-align: left; font-size: 13px; }
        .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>💈 ${salonName}</h1>
        <h2>📅 Agenda Diária de Atendimentos • ${profName}</h2>
        <div class="summary-box">
          <div class="summary-item">
            <strong>Data:</strong> ${formattedDate}<br/>
            <strong>Profissional:</strong> ${profName}
          </div>
          <div class="summary-item" style="text-align: right;">
            <strong>Total de Clientes do Dia:</strong> ${totalAgendados} agendamentos<br/>
            <strong>Faturamento Estimado:</strong> R$ ${valorTotalPrevisto.toFixed(2).replace('.', ',')}
          </div>
        </div>
      </div>

      <h3>Lista de Horários e Clientes do Dia</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 80px; text-align: center;">Horário</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th>Cliente / Contato</th>
            <th>Serviço Solicitado</th>
            <th style="width: 100px; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum horário registrado para esta data.</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 25px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #2563eb; font-size: 12px;">
        <strong>📌 Mensagem da Administração do Salão:</strong><br/>
        Tenha um excelente dia de trabalho, ${profName}! Esta escala foi emitida diretamente pelo painel do salão. Em caso de dúvidas ou remarcações, avise a recepção.
      </div>

      <div class="footer">
        Gerado automaticamente pelo Sistema Agenda Fácil Salão • ${new Date().toLocaleString('pt-BR')}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Agenda_${profName.replace(/\s+/g, '_')}_${dateStr}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a formatted Word (.doc) document for employee commission closing (Fechamento).
 */
export function downloadFechamentoWord(
  salonName: string,
  profName: string,
  summary: FechamentoSummaryExport,
  items: FechamentoItemExport[]
) {
  const tableRows = items.map((item, idx) => {
    const [year, month, day] = item.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 12px;">${formattedDate} às ${item.time}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 12px;">${item.clientName}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px;">${item.serviceName}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-size: 12px;">R$ ${item.grossAmount.toFixed(2).replace('.', ',')}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; font-size: 12px; color: #16a34a;">R$ ${item.commissionAmount.toFixed(2).replace('.', ',')}</td>
      </tr>
    `;
  }).join('');

  const wordHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Fechamento de Comissões - ${profName}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; margin: 20px; }
        h1 { color: #0f172a; font-size: 22px; margin-bottom: 4px; }
        h2 { color: #16a34a; font-size: 16px; margin-top: 0; margin-bottom: 16px; }
        .card { background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .stats-grid { display: table; width: 100%; margin-top: 10px; }
        .stats-cell { display: table-cell; padding: 8px; vertical-align: top; }
        .stat-val { font-size: 18px; font-weight: bold; color: #0f172a; }
        .stat-val-green { font-size: 20px; font-weight: bold; color: #16a34a; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th { background-color: #0f172a; color: #ffffff; padding: 9px; border: 1px solid #0f172a; text-align: left; font-size: 12px; }
        .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>💈 ${salonName}</h1>
        <h2>📄 Extrato de Fechamento de Comissões • ${profName}</h2>
        <p style="font-size: 13px; margin: 0 0 10px 0;"><strong>Período de Apuração:</strong> ${summary.periodLabel}</p>

        <div class="stats-grid">
          <div class="stats-cell" style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-right: 10px;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Dias Trabalhados</span><br/>
            <span class="stat-val">📅 ${summary.totalDaysWorked} dias</span>
          </div>
          <div class="stats-cell" style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-right: 10px;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Clientes Atendidos</span><br/>
            <span class="stat-val">✂️ ${summary.totalClients} atendimentos</span>
          </div>
          <div class="stats-cell" style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-right: 10px;">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Faturamento Bruto</span><br/>
            <span class="stat-val">R$ ${summary.grossAmount.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="stats-cell" style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 6px; padding: 10px;">
            <span style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: bold;">Comissão Líquida (${summary.commissionPercent}%)</span><br/>
            <span class="stat-val-green">R$ ${summary.netCommission.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </div>

      <h3>Detalhamento dos Atendimentos Realizados</h3>
      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 130px;">Data & Hora</th>
            <th>Cliente</th>
            <th>Serviço Realizado</th>
            <th style="text-align: right; width: 100px;">Valor Bruto</th>
            <th style="text-align: right; width: 110px;">Comissão a Pagar</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows || '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum atendimento faturado neste período.</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: table; width: 100%;">
        <div style="display: table-cell; width: 48%; border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 12px;">
          <strong>${salonName}</strong><br/>
          Assinatura / Visto do Salão
        </div>
        <div style="display: table-cell; width: 4%;"></div>
        <div style="display: table-cell; width: 48%; border-top: 1px solid #0f172a; text-align: center; padding-top: 6px; font-size: 12px;">
          <strong>${profName}</strong><br/>
          Assinatura do Funcionário / Prestador
        </div>
      </div>

      <div class="footer">
        Documento gerado automaticamente pelo Sistema Agenda Fácil Salão • ${new Date().toLocaleString('pt-BR')}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Fechamento_${profName.replace(/\s+/g, '_')}_${summary.periodLabel.replace(/[\/\s:]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean print view for schedule
 */
export function printScheduleDirect(salonName: string, profName: string, dateStr: string, items: ScheduleItemExport[]) {
  const [year, month, day] = dateStr.split('-');
  const formattedDate = `${day}/${month}/${year}`;
  const totalAgendados = items.filter(i => i.status === 'agendado' || i.status === 'concluido').length;
  const valorTotalPrevisto = items.reduce((acc, curr) => acc + (curr.price || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Por favor, permita popups para imprimir a agenda.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Imprimir Agenda - ${profName} (${formattedDate})</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #111; padding: 20px; font-size: 12px; }
        .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        h1 { font-size: 18px; margin: 0 0 5px 0; }
        h2 { font-size: 14px; margin: 0 0 10px 0; color: #333; }
        .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
        th { background-color: #eee; font-weight: bold; }
        .center { text-align: center; }
        .right { text-align: right; }
        .status-agendado { font-weight: bold; color: #0284c7; }
        .status-concluido { font-weight: bold; color: #16a34a; }
        .status-bloqueado { font-weight: bold; color: #dc2626; }
        .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #777; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>💈 ${salonName}</h1>
        <h2>Agenda do Dia • Profissional: <strong>${profName}</strong></h2>
        <div class="meta">
          <div><strong>Data da Agenda:</strong> ${formattedDate}</div>
          <div><strong>Total Agendados:</strong> ${totalAgendados} clientes | <strong>Previsto:</strong> R$ ${valorTotalPrevisto.toFixed(2).replace('.', ',')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 70px;" class="center">Horário</th>
            <th style="width: 90px;" class="center">Status</th>
            <th>Cliente / Telefone</th>
            <th>Serviço</th>
            <th style="width: 80px;" class="right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td class="center" style="font-weight: bold;">${item.time}</td>
              <td class="center status-${item.status}">${item.status === 'concluido' ? 'Concluído' : item.status === 'agendado' ? 'Agendado' : item.status === 'bloqueado' ? 'Bloqueado' : 'Livre'}</td>
              <td><strong>${item.clientName || (item.status === 'bloqueado' ? (item.notes || 'Bloqueado') : '-')}</strong> ${item.clientPhone ? `(${item.clientPhone})` : ''}</td>
              <td>${item.serviceName || '-'}</td>
              <td class="right">${item.price ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Impresso em ${new Date().toLocaleString('pt-BR')} • Sistema Agenda Fácil Salão
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
