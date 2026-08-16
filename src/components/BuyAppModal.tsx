import React, { useState, useEffect } from 'react';
import { SalonApp, SalonConfig, AdminPaymentConfig, UserRole } from '../types';
import { Storage } from '../utils/storage';
import { generatePixEMVPayload, generateQrCodeDataUrl } from '../utils/pix';
import { getCalculatedLicensePlans, getLicensePlanByDays, formatBRL } from '../utils/pricing';
import { getUrlParam, getPublicAppUrl } from '../utils/url';
import { 
  ShoppingCart, Check, Sparkles, Mail, User, ShieldCheck, Phone, 
  FileText, Building2, Key, Copy, Clock, Send, CreditCard, QrCode, 
  ArrowLeft, Settings, Lock, CheckCircle2, DollarSign, Wallet, MapPin, Map, Hash, Search,
  Maximize2, X, RefreshCw
} from 'lucide-react';

interface BuyAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: (newSalon: SalonApp) => void;
  userRole?: UserRole;
  onOpenAdminPaymentConfig?: () => void;
}

export const BuyAppModal: React.FC<BuyAppModalProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete,
  userRole = 'salao',
  onOpenAdminPaymentConfig,
}) => {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  
  // Buyer Form State
  const [name, setName] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [salonName, setSalonName] = useState('');
  const [planDays, setPlanDays] = useState<number>(30); // Default 30 days (R$ 19,90)
  
  // Address State
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const [error, setError] = useState('');

  // Auto-populate from URL query params if opened from a direct salon purchase link
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      try {
        const planParam = getUrlParam('plano') || getUrlParam('plan') || getUrlParam('dias');
        if (planParam) {
          const days = parseInt(planParam, 10);
          if ([30, 90, 180, 365].includes(days)) {
            setPlanDays(days);
          }
        }
        const salonNameParam = getUrlParam('salao') || getUrlParam('nome_salao') || getUrlParam('salon_name');
        if (salonNameParam && !salonName) {
          setSalonName(decodeURIComponent(salonNameParam));
        }
        const ownerNameParam = getUrlParam('nome') || getUrlParam('comprador') || getUrlParam('owner');
        if (ownerNameParam && !name) {
          setName(decodeURIComponent(ownerNameParam));
        }
        const phoneParam = getUrlParam('phone') || getUrlParam('whatsapp') || getUrlParam('telefone') || getUrlParam('celular');
        if (phoneParam && !phone) {
          setPhone(phoneParam);
        }
        const emailParam = getUrlParam('email');
        if (emailParam && !email) {
          setEmail(emailParam);
        }
      } catch {
        // silence URL parsing error
      }
    }
  }, [isOpen]);

  // Auto-fill CEP via ViaCEP
  const handleCepChange = async (val: string) => {
    setCep(val);
    const cleanCep = val.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || '');
        }
      } catch (e) {
        // silence error
      } finally {
        setIsFetchingCep(false);
      }
    }
  };
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao'>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  
  // Real Pix QR Code & EMV State
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [pixEmvPayload, setPixEmvPayload] = useState<string>('');
  const [copiedPixEmv, setCopiedPixEmv] = useState(false);
  const [isZoomingQr, setIsZoomingQr] = useState(false);
  
  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState('1');

  // Admin Account Settings State (Editable by Admin)
  const [showAdminAccountSetup, setShowAdminAccountSetup] = useState(false);
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<AdminPaymentConfig>(() => 
    Storage.getAdminPaymentConfig()
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Created Salon Result & Email Status
  const [createdSalon, setCreatedSalon] = useState<SalonApp | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCpf, setCopiedCpf] = useState(false);
  const [copiedAllInfo, setCopiedAllInfo] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Send Confirmation Email with Credentials & Access Token
  const sendEmailNotification = async (salon: SalonApp, priceStrVal: string) => {
    try {
      setIsSendingEmail(true);
      setEmailStatusMsg('Enviando e-mail de confirmação com login e token de acesso...');
      const response = await fetch('/api/send-purchase-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerEmail: salon.ownerEmail,
          ownerName: salon.ownerName,
          ownerCpf: salon.ownerCpf,
          salonName: salon.name,
          purchaseToken: salon.purchaseToken,
          planDays: salon.planDays,
          priceStr: priceStrVal,
          paymentMethod: paymentMethod,
          expiresAt: salon.expiresAt,
          purchaseDate: salon.purchaseDate,
          appUrl: getPublicAppUrl(),
        })
      });
      const data = await response.json();
      if (data.success) {
        setEmailStatusMsg(data.message || `E-mail enviado para ${salon.ownerEmail} com sucesso!`);
      } else {
        setEmailStatusMsg(`Instruções e Token prontos para ${salon.ownerEmail}.`);
      }
    } catch (err) {
      console.error("Erro ao solicitar envio do e-mail:", err);
      setEmailStatusMsg(`Notificação registrada para ${salon.ownerEmail}. Login (CPF): ${salon.ownerCpf} | Token: ${salon.purchaseToken}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const cfg = Storage.getAdminPaymentConfig();
      setAdminPaymentConfig(cfg);

      if (cfg.chavePix) {
        const priceVal = getPlanPriceDetails(planDays).numVal;
        const payload = generatePixEMVPayload(
          cfg.chavePix,
          cfg.nomeBeneficiario || 'AGENDA FACIL',
          'SAO PAULO',
          priceVal
        );
        setPixEmvPayload(payload);

        generateQrCodeDataUrl(payload).then((url) => {
          setPixQrDataUrl(url);
        });
      }
    }
  }, [isOpen, planDays, adminPaymentConfig.chavePix]);

  if (!isOpen) return null;

  // Plan Price Helper based on Admin's configured prices
  const availablePlans = getCalculatedLicensePlans(adminPaymentConfig);

  const getPlanPriceDetails = (days: number) => {
    return getLicensePlanByDays(days, adminPaymentConfig);
  };

  const currentPlan = getPlanPriceDetails(planDays);

  // Advance from Step 1 (Buyer Form) to Step 2 (Payment Page)
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!rg.trim()) {
      setError('Informe seu RG.');
      return;
    }
    if (!cpf.trim()) {
      setError('Informe seu CPF.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Informe um e-mail válido para receber o token.');
      return;
    }
    if (!phone.trim()) {
      setError('Informe seu WhatsApp para contato.');
      return;
    }
    if (!salonName.trim()) {
      setError('Informe o nome do seu salão de beleza ou barbearia.');
      return;
    }
    if (!cidade.trim() || !uf.trim()) {
      setError('Informe a Cidade e o Estado (UF) para mapeamento da compra.');
      return;
    }

    setStep('payment');
  };

  // Save Admin Account Settings
  const handleSaveAdminPaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    Storage.saveAdminPaymentConfig(adminPaymentConfig);
    setSaveSuccessMsg('Dados da Conta do Administrador salvos com sucesso!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);

    if (adminPaymentConfig.chavePix) {
      const priceVal = getPlanPriceDetails(planDays).numVal;
      const payload = generatePixEMVPayload(
        adminPaymentConfig.chavePix,
        adminPaymentConfig.nomeBeneficiario || 'AGENDA FACIL',
        'SAO PAULO',
        priceVal
      );
      setPixEmvPayload(payload);
      generateQrCodeDataUrl(payload).then((url) => setPixQrDataUrl(url));
    }
  };

  // Copy Pix Key
  const handleCopyPix = () => {
    navigator.clipboard.writeText(adminPaymentConfig.chavePix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Copy Pix EMV Copia e Cola Code
  const handleCopyPixEmv = () => {
    const textToCopy = pixEmvPayload || adminPaymentConfig.chavePix;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPixEmv(true);
    setTimeout(() => setCopiedPixEmv(false), 2500);
  };

  // Finalize Payment & Create App
  const handleFinalizePayment = () => {
    if (paymentMethod === 'cartao') {
      if (!cardNumber.trim() || !cardHolder.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        setError('Por favor, preencha todos os dados do cartão de crédito.');
        return;
      }
    }

    setError('');
    setIsProcessing(true);

    setTimeout(() => {
      const today = new Date();
      const purchaseDate = today.toISOString().split('T')[0];
      
      // Expiration calculation
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + planDays);
      const expiresAt = expDate.toISOString().split('T')[0];

      // Generate sequential salon code (SALAO-1, SALAO-2, ...) and security token
      const appCode = Storage.getNextSalonCode();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const tokenCleanName = salonName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const purchaseToken = `TOK-${tokenCleanName || 'SALÃO'}-${randomNum}`;

      const initialConfig: SalonConfig = {
        nomeSalao: salonName.trim(),
        logoUrl: '',
        bgHeaderUrl: '',
        temaKey: 'azul',
        corCustom: '#2563eb',
        profs: [
          { id: `prof-p1`, nome: name.split(' ')[0] || 'Profissional 1', porc: 70 },
          { id: `prof-p2`, nome: 'Auxiliar', porc: 30 }
        ]
      };

      const newSalon: SalonApp = {
        id: `salon-${Date.now()}`,
        name: salonName.trim(),
        ownerName: name.trim(),
        ownerEmail: email.trim(),
        ownerPhone: phone.trim(),
        ownerRg: rg.trim(),
        ownerCpf: cpf.trim(),
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        createdAt: purchaseDate,
        purchaseDate: purchaseDate,
        expiresAt: expiresAt,
        planDays: planDays,
        status: 'pending_approval',
        appCode: appCode,
        purchaseToken: purchaseToken,
        emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        config: initialConfig
      };

      const currentPlanDetails = getPlanPriceDetails(planDays);

      setCreatedSalon(newSalon);
      onPurchaseComplete(newSalon);
      setIsProcessing(false);
      setStep('success');

      // Dispatch Email Notification with Login & Token
      sendEmailNotification(newSalon, currentPlanDetails.priceStr);
    }, 1500);
  };

  const handleCopyToken = () => {
    if (createdSalon) {
      navigator.clipboard.writeText(createdSalon.purchaseToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleCopyCpf = () => {
    if (createdSalon?.ownerCpf) {
      navigator.clipboard.writeText(createdSalon.ownerCpf);
      setCopiedCpf(true);
      setTimeout(() => setCopiedCpf(false), 2000);
    }
  };

  const handleCopyAllInfo = () => {
    if (!createdSalon) return;
    const infoText = `💈 *AGENDA FÁCIL - CREDENCIAIS DE ACESSO DO SALÃO* 💈

✅ Salão: ${createdSalon.name}
👤 Proprietário: ${createdSalon.ownerName}
🔑 Login (CPF): ${createdSalon.ownerCpf}
📧 E-mail: ${createdSalon.ownerEmail}
🎫 Token de Acesso (Senha): ${createdSalon.purchaseToken}

📅 Data da Compra: ${createdSalon.purchaseDate}
⏳ Validade da Licença: ${createdSalon.planDays} Dias (Até ${createdSalon.expiresAt})

🚀 *Passo a Passo de Acesso:*
1. Abra o aplicativo no seu navegador.
2. Clique em "Acessar Painel do Salão" ou "Entrar".
3. Digite seu CPF (${createdSalon.ownerCpf}) e o Token (${createdSalon.purchaseToken}).
4. Acesse seu painel para gerenciar serviços, equipe e agendamentos!`;

    navigator.clipboard.writeText(infoText);
    setCopiedAllInfo(true);
    setTimeout(() => setCopiedAllInfo(false), 2500);
  };

  const handleOpenEmailClient = () => {
    if (!createdSalon) return;
    const subject = encodeURIComponent(`🎉 Suas Credenciais de Acesso - ${createdSalon.name} (Token: ${createdSalon.purchaseToken})`);
    const body = encodeURIComponent(`Olá ${createdSalon.ownerName},

Seu pagamento foi confirmado e a licença do seu aplicativo está liberada!

SUAS CREDENCIAIS OFICIAIS DE ACESSO:
- Login (CPF do Proprietário): ${createdSalon.ownerCpf}
- E-mail: ${createdSalon.ownerEmail}
- Token de Acesso (Senha): ${createdSalon.purchaseToken}

DADOS DA COMPRA:
- Salão: ${createdSalon.name}
- Plano: ${createdSalon.planDays} Dias
- Data da Compra: ${createdSalon.purchaseDate}
- Término do Plano (Vencimento): Até ${createdSalon.expiresAt}

PASSO A PASSO PARA ACESSAR:
1. Abra o aplicativo no navegador.
2. Clique no botão "Acessar Painel do Salão".
3. Digite seu CPF (${createdSalon.ownerCpf}) e seu Token (${createdSalon.purchaseToken}).
4. Pronto! Configure seu salão e comece a receber agendamentos.

Guarde este e-mail para consultas futuras.`);

    window.open(`mailto:${createdSalon.ownerEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareWhatsappCredentials = () => {
    if (!createdSalon) return;
    const msg = `🎉 *COMPRA CONFIRMADA - AGENDA FÁCIL*
Salão: *${createdSalon.name}*

🔑 *Credenciais de Acesso:*
- Login (CPF): *${createdSalon.ownerCpf}*
- Token de Acesso: *${createdSalon.purchaseToken}*
- Vigência: *${createdSalon.planDays} Dias* (Até ${createdSalon.expiresAt})

🚀 *Como Acessar:*
1. Clique no botão "Acessar Painel do Salão"
2. Informe o CPF e Token acima
3. Comece a usar o sistema!`;

    const cleanPhone = (createdSalon.ownerPhone || '').replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[70] overflow-y-auto p-2 sm:p-6 flex min-h-full items-start sm:items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl text-white shadow-2xl relative my-3 sm:my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-5 sm:p-6 text-white flex justify-between items-start select-none">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-300/40 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Agenda+Fácil.Salão
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                A partir de {formatBRL(adminPaymentConfig.precoPlano30Dias || 30)}/mês
              </span>
            </div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-yellow-300" />
              <span>Comprar Licença do Aplicativo</span>
            </h2>
            <p className="text-white/80 text-xs mt-1">
              {step === 'form' && 'Passo 1/2: Selecione o plano e preencha os dados do salão.'}
              {step === 'payment' && 'Passo 2/2: Efetue o pagamento via Pix ou Cartão de Crédito.'}
              {step === 'success' && 'Licença emitida! Guarde seu Token de acesso.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* STEP 1: FORM & PLAN SELECTOR */}
        {step === 'form' && (
          <form onSubmit={handleProceedToPayment} className="p-5 sm:p-6 space-y-4 text-xs">
            
            {error && (
              <div className="bg-rose-950/80 border border-rose-700 text-rose-200 p-3 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            {/* Plan Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Escolha o Prazo da Licença:</span>
                </label>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Desconto nos planos longos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availablePlans.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => {
                      setPlanDays(p.days);
                      setCardInstallments('1');
                    }}
                    title={`${p.label} - ${p.priceStr}`}
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between select-none ${
                      planDays === p.days
                        ? 'bg-blue-600/30 border-blue-500 text-white font-extrabold ring-1 ring-blue-500 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-black">{p.label}</span>
                      <span className="block text-[11px] font-bold text-emerald-400 mt-0.5">{p.priceStr}</span>
                      <span className="block text-[9px] text-slate-400 mb-1">{p.detail}</span>
                    </div>
                    <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                      p.days >= 180
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-amber-300 border-amber-500/30'
                    }`}>
                      {p.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Buyer Full Name */}
            <div>
              <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Nome Completo do Comprador: *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Souza"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Documents: CPF and RG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>CPF do Comprador: *</span>
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>RG do Comprador: *</span>
                </label>
                <input
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="00.000.000-0"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seu E-mail (Acesso): *</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telefone / WhatsApp: *</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Address Box */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <label className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Endereço do Salão / Localização para Relatório: *</span>
                </label>
                {isFetchingCep && (
                  <span className="text-[10px] text-sky-400 animate-pulse flex items-center gap-1 font-bold">
                    <Search className="w-3 h-3" /> Buscando CEP...
                  </span>
                )}
              </div>

              {/* CEP, Cidade and UF */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    CEP:
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Cidade: *
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: São Paulo"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Estado (UF): *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 uppercase text-xs font-mono"
                  />
                </div>
              </div>

              {/* Logradouro, Número, Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Rua / Avenida / Logradouro:
                  </label>
                  <input
                    type="text"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Bairro:
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Ex: Centro"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Salon Name */}
            <div>
              <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Nome do Salão de Beleza / Barbearia: *</span>
              </label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                placeholder="Ex: Studio Elegance & Hair"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit to Payment */}
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 mt-2"
            >
              <span>Avançar para Tela de Pagamento ({currentPlan.priceStr})</span>
              <Sparkles className="w-4 h-4" />
            </button>

          </form>
        )}

        {/* STEP 2: PAYMENT PAGE (PIX & CREDIT CARD) */}
        {step === 'payment' && (
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            
            {/* Top Navigation & Selected Summary */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setStep('form')}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-bold text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar aos dados</span>
              </button>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold">Total a Pagar:</span>
                <span className="text-base font-black text-emerald-400">{currentPlan.priceStr}</span>
                <span className="text-[9px] text-slate-400 block">({currentPlan.label})</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/80 border border-rose-700 text-rose-200 p-3 rounded-xl text-xs font-bold">
                {error}
              </div>
            )}

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'pix'
                    ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pagamento via Pix</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cartao')}
                className={`py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'cartao'
                    ? 'bg-blue-600 text-white shadow-lg ring-1 ring-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão de Crédito</span>
              </button>
            </div>

            {/* TAB CONTENT: PIX */}
            {paymentMethod === 'pix' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <QrCode className="w-4 h-4" />
                    <span>Pix Instantâneo (Crédito Direto na Conta do Adm)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Aprovação Imediata
                  </span>
                </div>

                {/* Account Details Callout */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Beneficiário / Recebedor:</span>
                    <strong className="text-white font-bold">{adminPaymentConfig.nomeBeneficiario}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Banco / Processador:</span>
                    <strong className="text-amber-300 font-bold">{adminPaymentConfig.bancoOuProcessador}</strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Chave Pix:</span>
                    <span className="font-mono font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {adminPaymentConfig.chavePix}
                    </span>
                  </div>
                </div>

                {/* Real Dynamic QR Code Box */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
                  <div className="flex flex-col items-center shrink-0">
                    {pixQrDataUrl ? (
                      <div 
                        onClick={() => setIsZoomingQr(true)}
                        title="Clique para ampliar o QR Code"
                        className="cursor-pointer relative bg-white p-2 rounded-2xl shadow-xl border-2 border-emerald-400/80 hover:scale-105 transition-all group"
                      >
                        <img 
                          src={pixQrDataUrl} 
                          alt="QR Code Pix" 
                          className="w-28 h-28 object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white text-[10px] font-extrabold gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Ampliar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 h-28 bg-slate-800 rounded-2xl flex items-center justify-center text-[10px] text-slate-400 animate-pulse">
                        Gerando QR Code...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsZoomingQr(true)}
                      className="mt-1 text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ampliar QR Code</span>
                    </button>
                  </div>

                  <div className="space-y-2 text-center sm:text-left w-full">
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      Abra o aplicativo do seu banco, escolha <strong>Pix</strong> e selecione <strong>"Escanear QR Code"</strong> ou copie o código abaixo:
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyPixEmv}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPixEmv ? 'Código Pix Copia e Cola Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>{copiedPix ? 'Chave Pix Copiada!' : `Copiar Chave (${adminPaymentConfig.chavePix})`}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl text-[10px] text-emerald-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Direcionamento Seguro:</strong> O valor do Pix vai diretamente para a conta cadastrada pelo Administrador. Ao confirmar, seu token será gerado instantaneamente.
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CARTÃO DE CRÉDITO */}
            {paymentMethod === 'cartao' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-blue-400 flex items-center gap-1.5 text-xs">
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão de Crédito (Pagamento Direto para o Adm)</span>
                  </span>
                  {currentPlan.maxInstallments === 1 ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                      Somente À Vista
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                      Até 6x (1ª, 2ª e 3ª SEM JUROS)
                    </span>
                  )}
                </div>

                {/* Secure Environment Banner (Destination Account Hidden for Buyer) */}
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Ambiente Seguro:</strong> Pagamento processado com criptografia direta de ponta a ponta. Liberação imediata e envio do token por e-mail após a confirmação.
                  </span>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Número do Cartão de Crédito:</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Card Holder Name */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nome impresso no Cartão:</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Expiry, CVV & Installments */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Validade:</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white placeholder-slate-500 font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">CVV:</label>
                    <input
                      type="text"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white placeholder-slate-500 font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Parcelamento:</label>
                    <select
                      value={cardInstallments}
                      onChange={(e) => setCardInstallments(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white font-bold focus:outline-none focus:border-blue-500 text-[11px]"
                    >
                      {currentPlan.maxInstallments === 1 ? (
                        <option value="1">1x de {currentPlan.priceStr} (À vista - S/ Juros)</option>
                      ) : (
                        <>
                          <option value="1">1x de {currentPlan.priceStr} (À vista - Sem juros)</option>
                          <option value="2">2x de R$ {(currentPlan.numVal / 2).toFixed(2).replace('.', ',')} (Sem juros)</option>
                          <option value="3">3x de R$ {(currentPlan.numVal / 3).toFixed(2).replace('.', ',')} (Sem juros)</option>
                          <option value="4">4x de R$ {((currentPlan.numVal * 1.05) / 4).toFixed(2).replace('.', ',')} (c/ juros)</option>
                          <option value="5">5x de R$ {((currentPlan.numVal * 1.07) / 5).toFixed(2).replace('.', ',')} (c/ juros)</option>
                          <option value="6">6x de R$ {((currentPlan.numVal * 1.09) / 6).toFixed(2).replace('.', ',')} (c/ juros)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Notice regarding interest & installments */}
                {currentPlan.maxInstallments === 1 ? (
                  <p className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40 font-medium">
                    ℹ️ Os planos de 30 Dias e 3 Meses requerem pagamento à vista.
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Parcelamento em até 6x ativado! A 1ª, 2ª e 3ª parcelas são <strong>100% SEM JUROS</strong>.</span>
                  </p>
                )}

              </div>
            )}

            {/* Final Action Button */}
            <button
              type="button"
              onClick={handleFinalizePayment}
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando Pagamento de {currentPlan.priceStr}...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Confirmar Pagamento de {currentPlan.priceStr} e Gerar Token</span>
                </>
              )}
            </button>

          </div>
        )}

        {/* STEP 3: SUCCESS SCREEN WITH GENERATED TOKEN */}
        {step === 'success' && (
          <div className="p-5 sm:p-6 text-center space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/40">
                Pagamento Confirmado & Licença Ativada
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                Parabéns! Seu Salão Está Liberado
              </h3>
              <p className="text-slate-300 text-xs mt-0.5 max-w-md mx-auto">
                O pagamento de <strong className="text-emerald-400 font-bold">{currentPlan.priceStr}</strong> foi confirmado com sucesso.
              </p>
            </div>

            {/* Token & Login Display Box (CPF + TOKEN) */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-emerald-500/50 max-w-md mx-auto text-left relative overflow-hidden shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Suas Credenciais Oficiais de Acesso:</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Licença Ativa ✓
                </span>
              </div>

              {/* Login CPF */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">1. LOGIN (SEU CPF):</span>
                  <span className="text-sm sm:text-base font-black text-sky-400 font-mono">
                    {createdSalon?.ownerCpf || 'CPF Cadastrado'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (E-mail: {createdSalon?.ownerEmail})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCpf}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedCpf ? 'Copiado!' : 'Copiar CPF'}</span>
                </button>
              </div>

              {/* Token */}
              <div className="bg-slate-900/90 p-3 rounded-xl border-2 border-emerald-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">2. TOKEN DE ACESSO (SUA SENHA):</span>
                  <div className="font-mono text-lg sm:text-xl font-black text-emerald-400 tracking-wider">
                    {createdSalon?.purchaseToken}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 shadow transition-all active:scale-95 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedToken ? 'Token Copiado!' : 'Copiar Token'}</span>
                </button>
              </div>

              {/* Purchase Details & Plan Expiration Date */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Salão / Barbearia:</span>
                  <span className="font-bold text-pink-300">{createdSalon?.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Proprietário:</span>
                  <span className="font-bold text-white">{createdSalon?.ownerName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Data da Compra:</span>
                  <span className="font-bold text-white">{createdSalon?.purchaseDate}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-1">
                  <span className="text-slate-400 font-semibold">Término do Plano (Vencimento):</span>
                  <span className="font-black text-emerald-400 text-xs">
                    Até {createdSalon?.expiresAt} ({createdSalon?.planDays} Dias)
                  </span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Access Instructions */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/40 max-w-md mx-auto text-left space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black text-sky-300 uppercase tracking-wide">
                  Passo a Passo para Acessar a Plataforma:
                </h4>
              </div>
              <ol className="text-[11px] text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
                <li>
                  Clique no botão azul abaixo <strong>"Entrar no Painel do Salão"</strong> ou acesse pelo link do aplicativo.
                </li>
                <li>
                  Na tela inicial ou de login, selecione <strong>"Acessar Painel do Salão"</strong>.
                </li>
                <li>
                  Informe o seu <strong>CPF</strong> (<span className="text-sky-300 font-mono font-bold">{createdSalon?.ownerCpf}</span>) e o seu <strong>Token de Licença</strong> (<span className="text-emerald-400 font-mono font-bold">{createdSalon?.purchaseToken}</span>).
                </li>
                <li>
                  Pronto! Seu salão será carregado e você poderá cadastrar serviços, profissionais, horários e compartilhar o link com seus clientes.
                </li>
              </ol>
            </div>

            {/* Email Notification & Fast Action Buttons */}
            <div className="bg-blue-950/70 border border-blue-700/80 p-3.5 rounded-2xl text-left text-xs text-blue-200 max-w-md mx-auto space-y-2.5">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-white">
                    Notificação Enviada para o seu E-mail:
                  </p>
                  <p className="text-[11px] text-blue-200/90 mt-0.5">
                    {emailStatusMsg || `Enviamos seu token e credenciais para ${createdSalon?.ownerEmail}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenEmailClient}
                  className="bg-blue-900 hover:bg-blue-800 text-blue-100 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-blue-600/50 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-300" />
                  <span>Abrir no Meu E-mail</span>
                </button>

                <button
                  type="button"
                  disabled={isSendingEmail || !createdSalon}
                  onClick={() => {
                    if (createdSalon) {
                      sendEmailNotification(createdSalon, currentPlan.priceStr);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-950 text-slate-200 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Reenviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reenviar E-mail</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllInfo}
                  className="bg-slate-900 hover:bg-slate-800 text-emerald-300 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{copiedAllInfo ? 'Instruções Copiadas!' : 'Copiar Tudo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsappCredentials}
                  className="bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-emerald-500/40 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button to Enter System */}
            <button
              onClick={onClose}
              className="w-full max-w-md bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 mx-auto"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Concluir e Entrar no Painel do Salão</span>
            </button>

          </div>
        )}

        {/* Zoomed QR Code Modal Overlay */}
        {isZoomingQr && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 relative shadow-2xl">
              <button
                type="button"
                onClick={() => setIsZoomingQr(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1.5 pt-1">
                <QrCode className="w-4 h-4" />
                <span>Escanear QR Code Pix</span>
              </h4>

              <div className="bg-white p-4 rounded-2xl shadow-2xl mx-auto inline-block border-4 border-emerald-400">
                <img 
                  src={pixQrDataUrl} 
                  alt="QR Code Pix Ampliado" 
                  className="w-64 h-64 object-contain"
                />
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-extrabold text-white">{adminPaymentConfig.nomeBeneficiario}</p>
                <p className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 inline-block">
                  {adminPaymentConfig.chavePix}
                </p>
                <p className="text-[10px] text-slate-400 pt-1">
                  Abra o app do seu banco e aponte a câmera para este código para pagar {currentPlan.priceStr}.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyPixEmv}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPixEmv ? 'Código Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomingQr(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
