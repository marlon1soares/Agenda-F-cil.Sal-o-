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
  <title>Compra Confirmada - Agenda Fácil</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    
    <!-- Header -->
    <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 20px;">
      <h1 style="color: #38bdf8; font-size: 24px; margin: 0; font-weight: 800;">💈 Agenda Fácil - Salão & Barbearia</h1>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 5px;">Notificação de Pagamento & Liberação de Licença</p>
    </div>

    <!-- Status Banner -->
    <div style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 12px; padding: 15px; text-align: center; margin-bottom: 25px;">
      <h2 style="color: #34d399; font-size: 18px; margin: 0; font-weight: bold;">🎉 Pagamento Realizado com Sucesso!</h2>
      <p style="color: #e2e8f0; font-size: 13px; margin: 5px 0 0 0;">Sua licença foi ativada e seu aplicativo já está liberado para uso.</p>
    </div>

    <!-- Credentials Box (CPF + TOKEN) -->
    <div style="background-color: #020617; border: 2px solid #38bdf8; border-radius: 14px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #f59e0b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">🔑 SUAS CREDENCIAIS OFICIAIS DE ACESSO:</h3>
      
      <div style="margin-bottom: 12px; background-color: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155;">
        <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; font-weight: bold;">1. LOGIN (SEU CPF / E-MAIL):</span>
        <strong style="color: #38bdf8; font-size: 16px; font-family: monospace;">${displayCpf}</strong>
        <span style="color: #64748b; font-size: 11px; display: block; margin-top: 2px;">(E-mail: ${ownerEmail})</span>
      </div>

      <div style="background-color: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px dashed #10b981;">
        <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; font-weight: bold;">2. TOKEN DE ACESSO (SUA SENHA):</span>
        <div style="font-family: monospace; font-size: 22px; font-weight: 900; color: #34d399; letter-spacing: 2px; text-align: center; margin-top: 5px;">
          ${purchaseToken}
        </div>
      </div>
    </div>

    <!-- Step by Step Access Guide -->
    <div style="background-color: #0f172a; border-radius: 12px; padding: 18px; margin-bottom: 25px; border: 1px solid #38bdf8;">
      <h3 style="color: #38bdf8; font-size: 14px; margin: 0 0 12px 0; border-bottom: 1px solid #334155; padding-bottom: 8px;">🚀 Passo a Passo para Acessar a Plataforma:</h3>
      <ol style="margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 13px; line-height: 1.7;">
        <li>Abra o link do aplicativo no seu celular ou computador (<a href="${appUrl}" style="color: #38bdf8; text-decoration: underline;">Clique aqui para abrir</a>).</li>
        <li>No menu inicial, clique em <strong>"Acessar Painel do Salão"</strong> ou <strong>"Entrar"</strong>.</li>
        <li>Informe o seu <strong>CPF</strong> (<code style="background-color: #1e293b; padding: 2px 6px; border-radius: 4px; color: #38bdf8;">${displayCpf}</code>) e o <strong>Token de Licença</strong> (<code style="background-color: #1e293b; padding: 2px 6px; border-radius: 4px; color: #34d399;">${purchaseToken}</code>).</li>
        <li>Pronto! Você entrará no painel de administração do seu salão (<strong>${salonName || "Seu Salão"}</strong>) para gerenciar agendamentos, serviços e faturamento.</li>
      </ol>
    </div>

    <!-- Purchase Details & Validity -->
    <div style="background-color: #0f172a; border-radius: 12px; padding: 18px; margin-bottom: 25px; border: 1px solid #334155;">
      <h3 style="color: #cbd5e1; font-size: 14px; margin: 0 0 12px 0; border-bottom: 1px solid #334155; padding-bottom: 8px;">📋 Resumo da Compra & Vigência do Plano:</h3>
      <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Salão / Barbearia:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ffffff;">${salonName || "Salão"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Proprietário:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ffffff;">${ownerName || "Cliente"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">CPF do Comprador:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #38bdf8;">${displayCpf}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Plano Adquirido:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #38bdf8;">${planDays || 30} Dias</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Forma de Pagamento:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #f59e0b;">${paymentMethodLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Valor Pago:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #34d399;">${priceStr || "R$ 0,00"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Data da Compra:</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ffffff;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">Término do Plano (Vencimento):</td>
          <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #34d399; font-size: 14px;">Até ${formattedExpiry}</td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${appUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 15px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
        🚀 Acessar a Plataforma do Salão Agora
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #334155; padding-top: 15px; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">Este e-mail é gerado automaticamente após a confirmação de compra.</p>
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
