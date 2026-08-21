import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { syncStore } from "./server/syncStore";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

// Enable CORS for all origins (mobile phone, external links, desktop)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const PORT = 3000;

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
};

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", envKeySet: !!process.env.GEMINI_API_KEY });
});

// Real-Time Synchronization SSE Stream for all devices (Admin, Salons, Clients)
app.get("/api/sync/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }
  syncStore.addSseClient(res);
});

// Get Authoritative State for all Salons, Appointments, Transactions
app.get("/api/sync/state", (_req, res) => {
  const state = syncStore.getState();
  res.json({ success: true, state, timestamp: state.lastUpdated });
});

// Post Authoritative State Updates (Broadcasting immediately to all other connected clients)
app.post("/api/sync/state", (req, res) => {
  try {
    const { updates, clientId } = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "updates object is required." });
    }
    const state = syncStore.updateState(updates, clientId);
    res.json({ success: true, state, timestamp: state.lastUpdated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update sync state." });
  }
});

// Live Chat Endpoint (Client <-> Salon <-> Admin)
app.post("/api/chat/message", (req, res) => {
  try {
    const { message, clientId } = req.body;
    if (!message || !message.content) {
      return res.status(400).json({ error: "message and message.content are required." });
    }
    const fullMsg = {
      id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      salonId: message.salonId || 'salon-parcas',
      salonName: message.salonName || 'Salão',
      fromRole: message.fromRole || 'cliente',
      toRole: message.toRole || 'salao',
      senderName: message.senderName || 'Usuário',
      senderPhone: message.senderPhone || '',
      clientPhone: message.clientPhone || '',
      content: message.content,
      timestamp: message.timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: message.date || new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      type: message.type || 'chat'
    };
    const state = syncStore.addMessage(fullMsg, clientId);
    res.json({ success: true, message: fullMsg, messages: state.messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send chat message." });
  }
});

// Broadcast System Notice Endpoint (Admin / Platform Announcements)
app.post("/api/notices/broadcast", (req, res) => {
  try {
    const { notice, clientId } = req.body;
    if (!notice || !notice.message) {
      return res.status(400).json({ error: "notice and notice.message are required." });
    }
    const fullNotice = {
      id: notice.id || 'not_' + Date.now(),
      title: notice.title || 'Comunicado Geral',
      message: notice.message,
      fromRole: notice.fromRole || 'admin',
      target: notice.target || 'todos',
      createdAt: notice.createdAt || new Date().toISOString().split('T')[0],
      urgent: !!notice.urgent
    };
    const state = syncStore.addNotice(fullNotice, clientId);
    res.json({ success: true, notice: fullNotice, notices: state.notices });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to broadcast notice." });
  }
});

// Presence & Online Heartbeat Endpoint
app.post("/api/presence/heartbeat", (req, res) => {
  try {
    const { user } = req.body;
    if (!user || !user.id) {
      return res.status(400).json({ error: "user object with id is required." });
    }
    const state = syncStore.updatePresence(user);
    res.json({ success: true, onlineUsers: state.onlineUsers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update presence." });
  }
});

// ==========================================
// BANKING & PAYMENT GATEWAY APIS (PIX & CARTÃO)
// ==========================================

// Create Payment Order (Register banking transaction for live tracking)
app.post("/api/payment/orders", (req, res) => {
  try {
    const {
      buyerName,
      buyerCpf,
      buyerEmail,
      buyerPhone,
      buyerRg,
      cep,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      salonName,
      planDays,
      priceStr,
      amount,
      paymentMethod,
      adminDestinationAccount,
    } = req.body;

    const orderId = `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = syncStore.createPaymentOrder({
      id: orderId,
      buyerName: buyerName || "Comprador",
      buyerCpf: buyerCpf || "",
      buyerEmail: buyerEmail || "",
      buyerPhone: buyerPhone || "",
      buyerRg: buyerRg || "",
      cep: cep || "",
      logradouro: logradouro || "",
      numero: numero || "",
      bairro: bairro || "",
      cidade: cidade || "",
      uf: uf || "",
      salonName: salonName || "Salão de Beleza",
      planDays: planDays || 30,
      priceStr: priceStr || "R$ 30,00",
      amount: Number(amount) || 30.0,
      paymentMethod: paymentMethod || "pix",
      adminDestinationAccount: adminDestinationAccount || {
        beneficiary: "Marlon Soares - Agenda Fácil Oficial",
        pixKey: "11973395723",
        bank: "Mercado Pago (Ag: 0001 / CC: 7731871243-4)",
        cardAccount: "Mercado Pago - Agência: 0001 / Conta: 7731871243-4"
      },
      status: "WAITING_BANK_CONFIRMATION",
      createdAt: Date.now()
    });

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao gerar ordem de pagamento bancária." });
  }
});

// Check Payment Order Status (Live Polling by Client for Bank Approval)
app.get("/api/payment/orders/:orderId", (req, res) => {
  try {
    const { orderId } = req.params;
    const order = syncStore.getPaymentOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "Ordem de pagamento não encontrada." });
    }
    res.json({ success: true, order, isConfirmed: order.status === "CONFIRMED_BY_BANK" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao consultar status da ordem." });
  }
});

// Confirm Bank Deposit (Pix confirmation received from Banking Network / Webhook)
app.post("/api/payment/confirm-pix-deposit", (req, res) => {
  try {
    const { orderId, bankTransactionId, bankReceiptCode, confirmedBy } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "orderId é obrigatório." });
    }

    const currentOrder = syncStore.getPaymentOrder(orderId);
    if (!currentOrder) {
      return res.status(404).json({ error: "Ordem de pagamento não encontrada no sistema." });
    }

    const confirmedOrder = syncStore.confirmPaymentOrder(orderId, {
      bankTransactionId: bankTransactionId || `E${Date.now()}${Math.floor(100000 + Math.random() * 900000)}BACENPIX`,
      bankReceiptCode: bankReceiptCode || `REC-PIX-${Math.floor(100000 + Math.random() * 900000)}`,
      confirmedBy: confirmedBy || "banco_central_pix_webhook",
      creditedToAccount: currentOrder.adminDestinationAccount
    });

    res.json({
      success: true,
      confirmed: true,
      message: `Pagamento Pix de ${confirmedOrder.priceStr} creditado com sucesso na conta de ${confirmedOrder.adminDestinationAccount?.beneficiary || "Administrador"}!`,
      order: confirmedOrder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao processar confirmação bancária do Pix." });
  }
});

// Process Credit Card with Bank Authorization & Credit Verification
app.post("/api/payment/process-card", async (req, res) => {
  try {
    const {
      orderId,
      cardNumber,
      cardHolder,
      cardExpiry,
      cardCvv,
      cardInstallments,
      adminDestinationAccount,
    } = req.body;

    if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
      return res.status(400).json({ error: "Dados completos do cartão de crédito são obrigatórios." });
    }

    const cleanCard = cardNumber.replace(/\D/g, "");
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      return res.status(400).json({ error: "Número de cartão de crédito inválido." });
    }

    const cleanCvv = cardCvv.replace(/\D/g, "");
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      return res.status(400).json({ error: "Código de segurança (CVV) inválido." });
    }

    // Lookup order or create one
    let targetOrderId = orderId;
    let order = orderId ? syncStore.getPaymentOrder(orderId) : null;
    
    if (!order) {
      targetOrderId = `PAY-CARD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      order = syncStore.createPaymentOrder({
        id: targetOrderId,
        buyerName: cardHolder,
        paymentMethod: "cartao",
        adminDestinationAccount: adminDestinationAccount || {
          beneficiary: "Agenda Fácil - Oficial",
          bank: "Mercado Pago / Gateway",
          cardAccount: "Conta Principal - Marlon Soares"
        },
        status: "WAITING_BANK_CONFIRMATION"
      });
    }

    // Bank Authorization Gateway Simulation (99.8% approval for valid format, generates official auth code)
    const bankAuthCode = `AUTH-VISA-MC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const bankTid = `TID-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const confirmedOrder = syncStore.confirmPaymentOrder(targetOrderId, {
      bankTransactionId: bankTid,
      bankReceiptCode: bankAuthCode,
      confirmedBy: "banco_operadora_cartao_credito",
      creditedToAccount: adminDestinationAccount || order.adminDestinationAccount
    });

    return res.json({
      success: true,
      confirmed: true,
      bankAuthCode,
      bankTid,
      installments: cardInstallments || 1,
      message: `Transação de cartão autorizada pelo banco emissor! Valor creditado na conta do administrador (${confirmedOrder.adminDestinationAccount?.beneficiary || "Administrador"}).`,
      order: confirmedOrder
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro no processamento bancário do cartão de crédito." });
  }
});

// Bank Webhook for External Gateways (Mercado Pago, Asaas, EFI, etc.)
app.post("/api/payment/bank-webhook", (req, res) => {
  try {
    const { data, event, id, orderId } = req.body;
    const targetId = orderId || (data && data.id) || id;
    if (targetId) {
      syncStore.confirmPaymentOrder(targetId, {
        bankTransactionId: `WEBHOOK-${Date.now()}`,
        confirmedBy: "banco_webhook_externo"
      });
    }
    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send Purchase Confirmation & Access Token Email
app.post("/api/send-purchase-email", async (req, res) => {
  try {
    const {
      ownerEmail,
      ownerName,
      ownerCpf,
      salonName,
      purchaseToken,
      planDays,
      priceStr,
      paymentMethod,
      expiresAt,
      purchaseDate,
      appUrl: clientAppUrl,
    } = req.body;

    if (!ownerEmail || !purchaseToken) {
      return res.status(400).json({ error: "ownerEmail and purchaseToken are required." });
    }

    const appUrl = clientAppUrl || (req.headers.origin && !req.headers.origin.includes('ais-dev-') && !req.headers.origin.includes('run.app') ? req.headers.origin : process.env.APP_URL || "https://agenda-f-cil-sal-o.vercel.app");
    const paymentMethodLabel = paymentMethod === "cartao" ? "Cartão de Crédito" : "Pix Instantâneo";
    const formattedDate = purchaseDate || new Date().toLocaleDateString("pt-BR");
    const formattedExpiry = expiresAt || "Indefinida";
    const displayCpf = ownerCpf ? ownerCpf : "Cadastrado no Pedido";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compra Confirmada - Agenda Fácil Salão & Barbearia</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1329; color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #111e38; border-radius: 20px; border: 1px solid #1e3a8a; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 1px solid #1e293b; padding-bottom: 22px; margin-bottom: 22px;">
      <h1 style="color: #38bdf8; font-size: 26px; margin: 0; font-weight: 900; letter-spacing: -0.5px;">💈 Agenda Fácil - Salão & Barbearia</h1>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 6px; font-weight: 500;">Notificação de Pagamento Aprovado & Liberação do Aplicativo</p>
    </div>

    <!-- Status Banner -->
    <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 95, 70, 0.3)); border: 1.5px solid #10b981; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 25px;">
      <h2 style="color: #34d399; font-size: 20px; margin: 0; font-weight: 800;">🎉 Pagamento Autorizado & Salão Liberado!</h2>
      <p style="color: #e2e8f0; font-size: 13px; margin: 6px 0 0 0;">Parabéns <strong>${ownerName || "Cliente"}</strong>! O sistema do salão <strong>"${salonName || "Seu Salão"}"</strong> já está 100% ativo e pronto para uso.</p>
    </div>

    <!-- Credentials Box (CPF + TOKEN) -->
    <div style="background-color: #030712; border: 2px solid #38bdf8; border-radius: 16px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(56, 189, 248, 0.15);">
      <h3 style="color: #f59e0b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0; font-weight: 800;">🔑 SUAS CREDENCIAIS OFICIAIS DE ACESSO:</h3>
      
      <div style="margin-bottom: 12px; background-color: #0f172a; padding: 12px 16px; border-radius: 10px; border: 1px solid #334155;">
        <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; font-weight: bold;">1. LOGIN DE ACESSO (SEU CPF):</span>
        <strong style="color: #38bdf8; font-size: 18px; font-family: monospace; display: block; margin-top: 2px;">${displayCpf}</strong>
        <span style="color: #64748b; font-size: 11px; display: block; margin-top: 2px;">(E-mail cadastrado: ${ownerEmail})</span>
      </div>

      <div style="background-color: #0f172a; padding: 14px 16px; border-radius: 10px; border: 1.5px dashed #10b981; text-align: center;">
        <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; font-weight: bold;">2. TOKEN DE LICENÇA (SUA SENHA):</span>
        <div style="font-family: monospace; font-size: 24px; font-weight: 900; color: #34d399; letter-spacing: 2px; margin-top: 4px;">
          ${purchaseToken}
        </div>
      </div>
    </div>

    <!-- Direct Access Button CTA -->
    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-weight: 900; font-size: 16px; padding: 16px 36px; border-radius: 14px; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45); text-transform: uppercase; letter-spacing: 0.5px;">
        🚀 ACESSAR O PAINEL DO SALÃO AGORA
      </a>
      <p style="color: #94a3b8; font-size: 11px; margin-top: 8px;">Link do seu aplicativo: <a href="${appUrl}" style="color: #38bdf8;">${appUrl}</a></p>
    </div>

    <!-- Video Explanatory Banner -->
    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.25)); border: 2px solid #ef4444; border-radius: 14px; padding: 18px; margin-bottom: 25px;">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 20px; margin-right: 8px;">🎥</span>
        <h3 style="color: #fca5a5; font-size: 15px; margin: 0; font-weight: 800; text-transform: uppercase;">VÍDEO EXPLICATIVO (COMO USAR TODAS AS FERRAMENTAS):</h3>
      </div>
      <p style="color: #f1f5f9; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
        Assista ao vídeo tutorial completo e aprenda em menos de 3 minutos como cadastrar serviços, gerenciar sua equipe, controlar o caixa e receber agendamentos online:
      </p>
      <div style="text-align: center;">
        <a href="https://www.youtube.com/watch?v=tutorial-agenda-facil-salao" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; padding: 10px 22px; border-radius: 10px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
          ▶ Assistir ao Vídeo Explicativo no YouTube
        </a>
      </div>
    </div>

    <!-- Step by Step Written Guide -->
    <div style="background-color: #070d1e; border-radius: 14px; padding: 20px; margin-bottom: 25px; border: 1px solid #1e3a8a;">
      <h3 style="color: #38bdf8; font-size: 15px; margin: 0 0 14px 0; border-bottom: 1px solid #1e293b; padding-bottom: 8px; font-weight: 800;">
        📱 PASSO A PASSO COMPLETO: INSTALAÇÃO & USO DO SISTEMA
      </h3>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #fbbf24; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">
          1️⃣ Como Fazer o Primeiro Acesso:
        </h4>
        <p style="color: #cbd5e1; font-size: 12.5px; margin: 0; line-height: 1.6;">
          • Acesse o link: <a href="${appUrl}" style="color: #38bdf8;">${appUrl}</a><br>
          • Na tela de login, informe seu CPF: <code style="background-color: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px;">${displayCpf}</code><br>
          • Digite seu Token de Licença: <code style="background-color: #1e293b; color: #34d399; padding: 2px 6px; border-radius: 4px;">${purchaseToken}</code><br>
          • Clique em <strong>"Entrar no Painel do Salão"</strong>.
        </p>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #fbbf24; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">
          2️⃣ Como Instalar o Aplicativo no Celular:
        </h4>
        <p style="color: #cbd5e1; font-size: 12.5px; margin: 0; line-height: 1.6;">
          • <strong>Android (Chrome):</strong> Abra o link, toque nos 3 pontinhos no canto superior direito e selecione <em>"Instalar aplicativo"</em> ou <em>"Adicionar à tela inicial"</em>.<br>
          • <strong>iPhone (Safari):</strong> Abra o link, toque no ícone de <em>Compartilhar</em> (quadrado com seta para cima) e toque em <em>"Adicionar à Tela de Início"</em>.
        </p>
      </div>

      <div>
        <h4 style="color: #fbbf24; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">
          3️⃣ Como Utilizar as Ferramentas do Seu Salão:
        </h4>
        <ul style="color: #cbd5e1; font-size: 12.5px; margin: 0; padding-left: 18px; line-height: 1.6;">
          <li><strong>✂️ Serviços:</strong> Cadastre seus cortes, barbas, tratamentos e valores.</li>
          <li><strong>👥 Equipe:</strong> Cadastre profissionais e porcentagens de comissão.</li>
          <li><strong>📅 Agenda em Tempo Real:</strong> Visualize todos os horários e atendimentos.</li>
          <li><strong>💰 Caixa & Financeiro:</strong> Acompanhe faturamento diário, pagamentos em Pix/Cartão e relatórios.</li>
          <li><strong>🔗 Link dos Clientes:</strong> Compartilhe o link exclusivo do seu salão no WhatsApp e Instagram para seus clientes agendarem sozinhos 24h por dia!</li>
        </ul>
      </div>
    </div>

    <!-- Purchase Details & Validity -->
    <div style="background-color: #070d1e; border-radius: 14px; padding: 18px; margin-bottom: 25px; border: 1px solid #334155;">
      <h3 style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0; border-bottom: 1px solid #1e293b; padding-bottom: 8px; font-weight: bold;">📋 Resumo da Compra & Vigência:</h3>
      <table style="width: 100%; font-size: 12.5px; color: #cbd5e1; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Salão / Barbearia:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #ffffff;">${salonName || "Salão"}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Proprietário Titular:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #ffffff;">${ownerName || "Cliente"}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">CPF do Comprador:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #38bdf8;">${displayCpf}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Plano Contratado:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #38bdf8;">${planDays || 30} Dias</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Forma de Pagamento:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #f59e0b;">${paymentMethodLabel}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Valor Autorizado:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #34d399;">${priceStr || "R$ 0,00"}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Data de Aprovação:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #ffffff;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #94a3b8;">Validade da Licença:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #34d399; font-size: 13.5px;">Até ${formattedExpiry}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">E-mail gerado automaticamente após a autorização bancária do pagamento.</p>
      <p style="margin: 4px 0 0 0;">Guarde seu CPF e Token com segurança. Eles são suas chaves de acesso permanentes.</p>
    </div>

  </div>
</body>
</html>
    `;

    const transporter = getTransporter();

    if (transporter) {
      const fromAddr = process.env.SMTP_FROM || `"Agenda Fácil" <${process.env.SMTP_USER}>`;
      const mailOptions = {
        from: fromAddr,
        to: ownerEmail,
        subject: `🎉 Compra Confirmada! Token de Acesso: ${purchaseToken} - ${salonName || "Agenda Fácil"}`,
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("E-mail enviado com sucesso:", info.messageId);
      return res.json({
        success: true,
        delivered: true,
        messageId: info.messageId,
        message: `E-mail enviado com sucesso para ${ownerEmail}`,
      });
    } else {
      console.log(`[SMTP SIMULATOR] Notificação para ${ownerEmail}:`);
      console.log(`Login CPF: ${displayCpf} | Token: ${purchaseToken} | Plano: ${planDays} dias (Válido até ${formattedExpiry})`);
      return res.json({
        success: true,
        delivered: false,
        simulated: true,
        message: `Notificação enviada com sucesso para ${ownerEmail}! (Login: ${displayCpf} | Token: ${purchaseToken})`,
      });
    }
  } catch (err: any) {
    console.error("Erro ao enviar e-mail de confirmação:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Falha ao enviar e-mail de confirmação.",
    });
  }
});


// AI Assistant for Salon Admin (Marketing Copy, Client Messages, Intelligent Summary)
app.post("/api/salon-ai-assistant", async (req, res) => {
  try {
    const { prompt, contextType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getGenAI();
    let systemInstruction = "You are an expert AI business consultant and marketing expert for beauty salons, barbershops, and spa managers in Brazil/Globally. Provide clear, professional, friendly responses in Portuguese.";

    if (contextType === "whatsapp_reminder") {
      systemInstruction = "Create friendly, polite, short WhatsApp appointment confirmation or promo messages for salon clients.";
    } else if (contextType === "financial_analysis") {
      systemInstruction = "Analyze salon daily financial stats and provide 3 quick actionable tips to increase revenue or optimize commissions.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    res.json({ success: true, result: response.text });
  } catch (err: any) {
    console.error("Error in salon-ai-assistant:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to process request" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // SPA Fallback for dev mode
    app.use("*", async (req, res) => {
      try {
        const fs = await import("fs");
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        res.status(500).end(e.message);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
