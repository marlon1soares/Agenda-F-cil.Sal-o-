import React, { useState, useEffect } from 'react';
import { SalonApp, SalonConfig, AdminPaymentConfig, UserRole } from '../types';
import { Storage } from '../utils/storage';
import { syncEngine } from '../utils/syncEngine';
import { generatePixEMVPayload, generateQrCodeDataUrl } from '../utils/pix';
import { getCalculatedLicensePlans, getLicensePlanByDays, formatBRL } from '../utils/pricing';
import { checkTrialEligibility, isAdminCpf, isAdminIdentifier, hasCpfUsedTrial } from '../utils/license';
import { getUrlParam, getPublicAppUrl, buildAppUrl } from '../utils/url';
import { VideoTutorialModal } from './VideoTutorialModal';
import { 
  ShoppingCart, Check, Sparkles, Mail, User, ShieldCheck, Phone, 
  FileText, Building2, Key, Copy, Clock, Send, CreditCard, QrCode, 
  ArrowLeft, Settings, Lock, Unlock, CheckCircle2, DollarSign, Wallet, MapPin, Map, Hash, Search,
  Maximize2, X, RefreshCw, AlertTriangle, CheckCircle, Link2, ExternalLink, Video, Smartphone, Play, Radio
} from 'lucide-react';

interface BuyAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseComplete: (newSalon: SalonApp) => void;
  userRole?: UserRole;
  activeSalon?: SalonApp | null;
  onUpdateSalon?: (updatedSalon: SalonApp) => void;
  onOpenSalonAuth?: (credentials?: { cpf?: string; token?: string }) => void;
  initialOrderId?: string;
}

export const BuyAppModal: React.FC<BuyAppModalProps> = ({
  isOpen,
  onClose,
  onPurchaseComplete,
  userRole = 'salao',
  activeSalon = null,
  onUpdateSalon,
  onOpenSalonAuth,
  initialOrderId,
}) => {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  
  // Buyer Form State
  const [name, setName] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [salonName, setSalonName] = useState('');
  const [planDays, setPlanDays] = useState<number>(15); // Default 15 days free trial for new users
  
  // Address State
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);

  const [error, setError] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Check if active user is an Administrator or if typed/active CPF belongs to a registered administrator
  const isSessionAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
  const isUserAdmin = Boolean(
    userRole === 'admin' ||
    isSessionAdmin ||
    isAdminCpf(cpf) ||
    isAdminIdentifier({ cpf, email, phone })
  );

  // Check if current CPF has already used the 15-day trial (Only restricts non-admin regular users)
  // Administradores possuem liberação total e ilimitada dos 15 dias gratuitos sempre que precisarem!
  const isTrialAlreadyUsed = !isUserAdmin && Boolean(
    (cpf.trim().length >= 11 && hasCpfUsedTrial(cpf, undefined, userRole))
  );

  // Form initialization or Order Recovery for Tracking Links (?confirmar-pedido=PAY-...)
  useEffect(() => {
    if (!isOpen) return;

    const trackingId = initialOrderId || 
                       getUrlParam('confirmar-pedido') || 
                       getUrlParam('confirmar_pedido') || 
                       getUrlParam('pedido') || 
                       getUrlParam('order') || 
                       getUrlParam('acompanhar') || 
                       getUrlParam('acompanhar-pedido') || 
                       getUrlParam('orderId') || 
                       getUrlParam('pay');

    if (trackingId) {
      // Restore and track existing bank order
      setActiveOrderId(trackingId);
      setStep('payment');
      setError('');

      fetch(`/api/payment/orders/${trackingId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.order) {
            const o = data.order;
            if (o.buyerName) setName(o.buyerName);
            if (o.buyerCpf) setCpf(o.buyerCpf);
            if (o.buyerEmail) setEmail(o.buyerEmail);
            if (o.buyerPhone) setPhone(o.buyerPhone);
            if (o.buyerRg) setRg(o.buyerRg);
            if (o.salonName) setSalonName(o.salonName);
            if (o.planDays) setPlanDays(o.planDays);
            if (o.cep) setCep(o.cep);
            if (o.logradouro) setLogradouro(o.logradouro);
            if (o.numero) setNumero(o.numero);
            if (o.bairro) setBairro(o.bairro);
            if (o.cidade) setCidade(o.cidade);
            if (o.uf) setUf(o.uf);
            if (o.paymentMethod) setPaymentMethod(o.paymentMethod);

            if (o.status === 'CONFIRMED_BY_BANK') {
              setBankOrderStatus('bank_confirmed');
              setBankReceipt(o);
              setTimeout(() => {
                executeSalonActivationAndAdvance(o);
              }, 1200);
            } else {
              setBankOrderStatus('waiting_bank');
            }
          }
        })
        .catch(err => {
          console.warn('Erro ao restaurar ordem de pagamento:', err);
          setBankOrderStatus('waiting_bank');
        });
    } else {
      // New buyer form start - blank clean fields
      setStep('form');
      setError('');
      setName('');
      setRg('');
      setCpf('');
      setEmail('');
      setPhone('');
      setSalonName('');
      setCep('');
      setLogradouro('');
      setNumero('');
      setBairro('');
      setCidade('');
      setUf('');
      setCardNumber('');
      setCardHolder('');
      setCardExpiry('');
      setCardCvv('');
      setBankOrderStatus('idle');
      setBankReceipt(null);

      // Default plan selection (respects optional query param e.g. ?plano=30, otherwise default to 15)
      try {
        const planParam = getUrlParam('plano') || getUrlParam('plan') || getUrlParam('dias');
        if (planParam) {
          const days = parseInt(planParam, 10);
          if ([15, 30, 90, 180, 365].includes(days)) {
            setPlanDays(days);
          } else {
            setPlanDays(15);
          }
        } else {
          setPlanDays(15);
        }
      } catch {
        setPlanDays(15);
      }
    }
  }, [isOpen, initialOrderId]);

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

  // Banking Order & Verification State (Auto-Advance upon bank credit)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [bankOrderStatus, setBankOrderStatus] = useState<'idle' | 'waiting_bank' | 'bank_confirmed' | 'failed'>('idle');
  const [bankReceipt, setBankReceipt] = useState<any | null>(null);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(false);
  const [isSimulatingPix, setIsSimulatingPix] = useState<boolean>(false);
  const [isProcessingCard, setIsProcessingCard] = useState<boolean>(false);
  const [cardError, setCardError] = useState<string>('');

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardInstallments, setCardInstallments] = useState(1);

  // Admin Account Settings Config (Read-Only from Storage for Checkout Display)
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<AdminPaymentConfig>(() => 
    Storage.getAdminPaymentConfig()
  );

  // Created Salon Result & Email Status
  const [createdSalon, setCreatedSalon] = useState<SalonApp | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCpf, setCopiedCpf] = useState(false);
  const [copiedAccessLink, setCopiedAccessLink] = useState(false);
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

  // Plan Price Helper based on Admin's configured prices
  const availablePlans = getCalculatedLicensePlans(adminPaymentConfig, true);
  const trialPlan = availablePlans.find(p => p.numVal === 0);
  const configuredTrialDays = trialPlan ? trialPlan.days : (adminPaymentConfig.diasGratuitos || 15);
  const isTrialEnabled = Boolean(trialPlan && adminPaymentConfig.habilitarPlanoGratuito !== false);

  const getPlanPriceDetails = (days: number) => {
    return getLicensePlanByDays(days, adminPaymentConfig);
  };

  const currentPlan = getPlanPriceDetails(planDays);
  const isTrialPlanSelected = isTrialEnabled && (planDays === configuredTrialDays || currentPlan.numVal === 0);

  useEffect(() => {
    if (isOpen) {
      const cfg = Storage.getAdminPaymentConfig();
      setAdminPaymentConfig(cfg);

      if (cfg.chavePix) {
        const plan = getLicensePlanByDays(planDays, cfg);
        const priceVal = plan?.numVal || 30;
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

  // Helper to Activate Salon and Auto-Advance to Step 3 (Success)
  const executeSalonActivationAndAdvance = (bankAuthData?: any) => {
    const finalName = name.trim() || 'Proprietário';
    const finalCpf = cpf.trim() || '000.000.000-00';
    const finalSalonName = salonName.trim() || 'Meu Salão & Barbearia';
    const finalEmail = (email.trim() && email.includes('@')) ? email.trim() : (email.trim() ? `${email.trim()}@gmail.com` : 'contato@salao.com');
    const finalPhone = phone.trim() || '(11) 99999-9999';
    const finalRg = rg.trim() || 'ISENTO';
    const finalCep = cep.trim() || '01001-000';
    const finalCidade = cidade.trim() || 'São Paulo';
    const finalUf = (uf.trim() || 'SP').toUpperCase();
    const finalLogradouro = logradouro.trim() || 'Av. Principal';
    const finalNumero = numero.trim() || '100';
    const finalBairro = bairro.trim() || 'Centro';

    const today = new Date();
    const purchaseDate = today.toISOString().split('T')[0];
    
    // Expiration calculation: runs for the full purchased period starting from payment day
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + planDays);
    const expiresAt = expDate.toISOString().split('T')[0];

    const currentSalons = Storage.getSalons();
    const cleanReqCpf = finalCpf.replace(/\D/g, '').trim();

    // Check if we are unblocking/renewing an existing salon by matching the buyer's CPF
    const existingSalon = cleanReqCpf ? currentSalons.find(s => {
      const sCpf = (s.ownerCpf || '').replace(/\D/g, '').trim();
      return sCpf && sCpf === cleanReqCpf;
    }) : undefined;

    const currentPlanDetails = getPlanPriceDetails(planDays);

    if (existingSalon) {
      // Unblock and activate existing salon with paid period
      const updatedSalon: SalonApp = {
        ...existingSalon,
        name: finalSalonName || existingSalon.name,
        ownerName: finalName || existingSalon.ownerName,
        ownerEmail: finalEmail || existingSalon.ownerEmail,
        ownerPhone: finalPhone || existingSalon.ownerPhone,
        ownerRg: finalRg || existingSalon.ownerRg,
        ownerCpf: finalCpf || existingSalon.ownerCpf,
        cep: finalCep || existingSalon.cep,
        logradouro: finalLogradouro || existingSalon.logradouro,
        numero: finalNumero || existingSalon.numero,
        bairro: finalBairro || existingSalon.bairro,
        cidade: finalCidade || existingSalon.cidade,
        uf: finalUf || existingSalon.uf || 'SP',
        status: 'active',
        isTrial: false,
        planDays: planDays,
        purchaseDate: purchaseDate,
        expiresAt: expiresAt,
        emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedList = currentSalons.map(s => s.id === updatedSalon.id ? updatedSalon : s);
      Storage.saveSalons(updatedList);
      syncEngine.pushUpdateImmediate({ salons: updatedList });

      if (onUpdateSalon) {
        onUpdateSalon(updatedSalon);
      }

      setCreatedSalon(updatedSalon);
      onPurchaseComplete(updatedSalon);
      setIsProcessing(false);
      setIsAutoAdvancing(false);
      setStep('success');

      sendEmailNotification(updatedSalon, currentPlanDetails.priceStr);
    } else {
      // Generate sequential salon code (SALAO-1, SALAO-2, ...) and security token
      const appCode = Storage.getNextSalonCode();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const tokenCleanName = finalSalonName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const purchaseToken = `TOK-${tokenCleanName || 'SALÃO'}-${randomNum}`;

      const initialConfig: SalonConfig = {
        nomeSalao: finalSalonName,
        logoUrl: '',
        bgHeaderUrl: '',
        temaKey: 'azul',
        corCustom: '#2563eb',
        profs: [
          { id: `prof-p1`, nome: finalName.split(' ')[0] || 'Profissional 1', porc: 70 },
          { id: `prof-p2`, nome: 'Auxiliar', porc: 30 }
        ]
      };

      const newSalon: SalonApp = {
        id: `salon-${Date.now()}`,
        name: finalSalonName,
        ownerName: finalName,
        ownerEmail: finalEmail,
        ownerPhone: finalPhone,
        ownerRg: finalRg,
        ownerCpf: finalCpf,
        cep: finalCep,
        logradouro: finalLogradouro,
        numero: finalNumero,
        bairro: finalBairro,
        cidade: finalCidade,
        uf: finalUf,
        createdAt: purchaseDate,
        purchaseDate: purchaseDate,
        expiresAt: expiresAt,
        planDays: planDays,
        isTrial: false,
        status: 'active',
        appCode: appCode,
        purchaseToken: purchaseToken,
        emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        config: initialConfig
      };

      const updatedList = [...currentSalons.filter(s => s.id !== newSalon.id), newSalon];
      Storage.saveSalons(updatedList);
      syncEngine.pushUpdateImmediate({ salons: updatedList });

      setCreatedSalon(newSalon);
      onPurchaseComplete(newSalon);
      setIsProcessing(false);
      setIsAutoAdvancing(false);
      setStep('success');

      sendEmailNotification(newSalon, currentPlanDetails.priceStr);
    }
  };

  // Real-Time Polling & SSE Listener for Direct Bank Notification (Pix & Card Webhooks)
  useEffect(() => {
    let interval: any = null;

    const handleBankNotificationReceived = (confirmedOrder: any) => {
      if (interval) clearInterval(interval);
      setBankOrderStatus('bank_confirmed');
      setBankReceipt(confirmedOrder);
      setIsAutoAdvancing(true);

      // Auto-advance after 1.8 seconds displaying the official bank authorization code
      setTimeout(() => {
        executeSalonActivationAndAdvance(confirmedOrder);
      }, 1800);
    };

    // 1. Polling interval to query bank order status from server
    if (isOpen && step === 'payment' && activeOrderId && bankOrderStatus === 'waiting_bank' && !isAutoAdvancing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment/orders/${activeOrderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isConfirmed || (data.order && data.order.status === 'CONFIRMED_BY_BANK')) {
              handleBankNotificationReceived(data.order);
            }
          }
        } catch (err) {
          // Keep polling silently
        }
      }, 1500);
    }

    // 2. Window SSE Event listener for instant notification when bank webhook lands
    const handleSyncEvent = (e: any) => {
      try {
        const state = e.detail?.state;
        if (state && state.paymentOrders && activeOrderId && state.paymentOrders[activeOrderId]) {
          const order = state.paymentOrders[activeOrderId];
          if (order.status === 'CONFIRMED_BY_BANK' && bankOrderStatus === 'waiting_bank') {
            handleBankNotificationReceived(order);
          }
        }
      } catch {}
    };

    window.addEventListener('salao_sync_data', handleSyncEvent);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('salao_sync_data', handleSyncEvent);
    };
  }, [isOpen, step, paymentMethod, activeOrderId, bankOrderStatus, isAutoAdvancing]);

  // Advance from Step 1 (Buyer Form) to Step 2 (Payment Page) or Activate 15-Day Free Trial
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalName = name.trim() || 'Proprietário';
    const finalCpf = cpf.trim() || '000.000.000-00';
    const finalSalonName = salonName.trim() || 'Meu Salão & Barbearia';
    const finalEmail = (email.trim() && email.includes('@')) ? email.trim() : (email.trim() ? `${email.trim()}@gmail.com` : 'contato@salao.com');
    const finalPhone = phone.trim() || '(11) 99999-9999';
    const finalRg = rg.trim() || 'ISENTO';
    const finalCep = cep.trim() || '01001-000';
    const finalCidade = cidade.trim() || 'São Paulo';
    const finalUf = (uf.trim() || 'SP').toUpperCase();
    const finalLogradouro = logradouro.trim() || 'Av. Principal';
    const finalNumero = numero.trim() || '100';
    const finalBairro = bairro.trim() || 'Centro';

    // IF FREE TRIAL IS SELECTED
    if (isTrialPlanSelected) {
      const eligibility = checkTrialEligibility(
        {
          cpf: finalCpf,
          rg: finalRg,
          phone: finalPhone,
          email: finalEmail,
          cep: finalCep,
          logradouro: finalLogradouro,
          numero: finalNumero
        },
        undefined,
        userRole
      );

      if (!eligibility.eligible) {
        setError(
          `⚠️ Não foi possível ativar o teste gratuito: ${eligibility.reason}\n\nO período de teste gratuito (${configuredTrialDays} dias) é concedido 1 única vez por CPF. Administradores possuem liberação ilimitada. Selecione diretamente um dos 4 planos pagos (Plano 1, 2, 3 ou 4).`
        );
        return;
      }

      // Activate Free Trial Immediately (No Payment Required)
      setIsProcessing(true);
      const today = new Date();
      const purchaseDate = today.toISOString().split('T')[0];
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + configuredTrialDays);
      const expiresAt = expDate.toISOString().split('T')[0];

      const appCode = Storage.getNextSalonCode();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const tokenCleanName = finalSalonName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
      const purchaseToken = `TOK-${tokenCleanName || 'SALAO'}-${randomNum}`;

      const initialConfig: SalonConfig = {
        nomeSalao: finalSalonName,
        logoUrl: '',
        bgHeaderUrl: '',
        temaKey: 'azul',
        corCustom: '#2563eb',
        profs: [
          { id: `prof-p1`, nome: finalName.split(' ')[0] || 'Profissional 1', porc: 70 },
          { id: `prof-p2`, nome: 'Auxiliar', porc: 30 }
        ]
      };

      const newSalon: SalonApp = {
        id: `salon-${Date.now()}`,
        name: finalSalonName,
        ownerName: finalName,
        ownerEmail: finalEmail,
        ownerPhone: finalPhone,
        ownerRg: finalRg,
        ownerCpf: finalCpf,
        cep: finalCep,
        logradouro: finalLogradouro,
        numero: finalNumero,
        bairro: finalBairro,
        cidade: finalCidade,
        uf: finalUf,
        createdAt: purchaseDate,
        purchaseDate: purchaseDate,
        expiresAt: expiresAt,
        planDays: configuredTrialDays,
        isTrial: true,
        trialStartedAt: purchaseDate,
        status: 'trial',
        appCode: appCode,
        purchaseToken: purchaseToken,
        emailSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        config: initialConfig
      };

      setCreatedSalon(newSalon);
      onPurchaseComplete(newSalon);
      setIsProcessing(false);
      setStep('success');

      sendEmailNotification(newSalon, `Grátis (${configuredTrialDays} Dias de Teste)`);
      return;
    }

    // IF PAID PLAN IS SELECTED: Register Banking Order on Backend
    const orderIdToUse = activeOrderId || `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveOrderId(orderIdToUse);
    setBankOrderStatus('waiting_bank');
    setBankReceipt(null);
    setIsAutoAdvancing(false);

    try {
      setIsProcessing(true);
      const res = await fetch('/api/payment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: finalName,
          buyerCpf: finalCpf,
          buyerEmail: finalEmail,
          buyerPhone: finalPhone,
          buyerRg: finalRg,
          cep: finalCep,
          logradouro: finalLogradouro,
          numero: finalNumero,
          bairro: finalBairro,
          cidade: finalCidade,
          uf: finalUf,
          salonName: finalSalonName,
          planDays: planDays,
          priceStr: currentPlan.priceStr,
          amount: currentPlan.numVal || 30,
          paymentMethod: paymentMethod,
          adminDestinationAccount: {
            beneficiary: adminPaymentConfig.nomeBeneficiario,
            pixKey: adminPaymentConfig.chavePix,
            bank: adminPaymentConfig.bancoOuProcessador,
            cardAccount: adminPaymentConfig.cartaoContaDestino,
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          setActiveOrderId(data.order.id);
          if (data.order.gatewayQrCode) {
            setPixEmvPayload(data.order.gatewayQrCode);
            if (data.order.gatewayQrCodeBase64) {
              setPixQrDataUrl(`data:image/png;base64,${data.order.gatewayQrCodeBase64}`);
            } else {
              generateQrCodeDataUrl(data.order.gatewayQrCode).then(url => {
                if (url) setPixQrDataUrl(url);
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Ordem de pagamento registrada localmente:', err);
    } finally {
      setIsProcessing(false);
      setStep('payment');
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

  // Simulate / Confirm Bank Pix Deposit (Webhook / Testing Confirmation)
  const handleSimulateBankPixDeposit = async () => {
    const targetId = activeOrderId || `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveOrderId(targetId);

    try {
      setIsSimulatingPix(true);
      setError('');
      const res = await fetch('/api/payment/confirm-pix-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: targetId,
          confirmedBy: 'banco_central_pix_webhook'
        })
      });
      
      let confirmedData: any = null;
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          confirmedData = data.order;
        }
      }

      if (!confirmedData) {
        // Resilient fallback for local / offline preview
        confirmedData = {
          id: targetId,
          status: 'CONFIRMED_BY_BANK',
          bankReceiptCode: `REC-PIX-${Math.floor(100000 + Math.random() * 900000)}`,
          confirmedAt: Date.now(),
          priceStr: currentPlan.priceStr,
          adminDestinationAccount: {
            beneficiary: adminPaymentConfig.nomeBeneficiario,
            pixKey: adminPaymentConfig.chavePix,
            bank: adminPaymentConfig.bancoOuProcessador,
          }
        };
      }

      setBankOrderStatus('bank_confirmed');
      setBankReceipt(confirmedData);
      setIsAutoAdvancing(true);

      // Auto-advance automatically
      setTimeout(() => {
        executeSalonActivationAndAdvance(confirmedData);
      }, 1500);
    } catch (err: any) {
      // Local fallback on connection issue
      const fallbackData = {
        id: targetId,
        status: 'CONFIRMED_BY_BANK',
        bankReceiptCode: `REC-PIX-${Math.floor(100000 + Math.random() * 900000)}`,
        confirmedAt: Date.now(),
        priceStr: currentPlan.priceStr,
        adminDestinationAccount: {
          beneficiary: adminPaymentConfig.nomeBeneficiario,
          pixKey: adminPaymentConfig.chavePix,
          bank: adminPaymentConfig.bancoOuProcessador,
        }
      };
      setBankOrderStatus('bank_confirmed');
      setBankReceipt(fallbackData);
      setIsAutoAdvancing(true);

      setTimeout(() => {
        executeSalonActivationAndAdvance(fallbackData);
      }, 1500);
    } finally {
      setIsSimulatingPix(false);
    }
  };

  // Process Card Payment with Bank Gateway & Auto-Advance
  const handleProcessCardPayment = async () => {
    setCardError('');
    if (!cardNumber.trim() || !cardHolder.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      setCardError('Por favor, preencha todos os campos do cartão de crédito.');
      return;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      setCardError('Número de cartão de crédito inválido (mínimo 13 a 19 dígitos).');
      return;
    }

    const cleanCvv = cardCvv.replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      setCardError('Código CVV inválido (3 ou 4 dígitos no verso do cartão).');
      return;
    }

    const targetId = activeOrderId || `PAY-CARD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveOrderId(targetId);

    try {
      setIsProcessingCard(true);
      const res = await fetch('/api/payment/process-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: targetId,
          cardNumber,
          cardHolder,
          cardExpiry,
          cardCvv,
          cardInstallments,
          adminDestinationAccount: {
            beneficiary: adminPaymentConfig.nomeBeneficiario,
            bank: adminPaymentConfig.bancoOuProcessador,
            cardAccount: adminPaymentConfig.cartaoContaDestino,
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.confirmed && data.order) {
        setBankOrderStatus('bank_confirmed');
        setBankReceipt(data.order);
        setIsAutoAdvancing(true);

        // Auto-advance automatically after 1.5 seconds showing approval
        setTimeout(() => {
          executeSalonActivationAndAdvance(data.order);
        }, 1500);
      } else {
        setCardError(data.error || 'Transação não autorizada pelo banco emissor do cartão de crédito.');
      }
    } catch (err: any) {
      setCardError(err.message || 'Falha na comunicação com o banco. Verifique os dados ou tente novamente.');
    } finally {
      setIsProcessingCard(false);
    }
  };

  const salonAccessUrl = buildAppUrl({ action: 'acesso-salao' });

  const handleCopyAccessLink = () => {
    navigator.clipboard.writeText(salonAccessUrl);
    setCopiedAccessLink(true);
    setTimeout(() => setCopiedAccessLink(false), 2000);
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

🔗 *Link de Acesso Direto:*
👉 ${salonAccessUrl}

📅 Data da Compra: ${createdSalon.purchaseDate}
⏳ Validade da Licença: ${createdSalon.planDays} Dias (Até ${createdSalon.expiresAt})

🚀 *Passo a Passo de Acesso:*
1. Abra o Link de Acesso: ${salonAccessUrl}
2. Digite seu CPF (${createdSalon.ownerCpf}) e o Token (${createdSalon.purchaseToken}).
3. Pronto! Acesse seu painel para gerenciar serviços, equipe e agendamentos!`;

    navigator.clipboard.writeText(infoText);
    setCopiedAllInfo(true);
    setTimeout(() => setCopiedAllInfo(false), 2500);
  };

  const handleOpenEmailClient = () => {
    if (!createdSalon) return;
    const subject = encodeURIComponent(`🎉 Pagamento Confirmado! Acesse seu Salão + Passo a Passo e Vídeo Explicativo - ${createdSalon.name}`);
    const body = encodeURIComponent(`Olá ${createdSalon.ownerName},

O pagamento da sua licença do Agenda Fácil foi confirmado com sucesso!
O seu salão "${createdSalon.name}" já está 100% liberado para uso.

🔑 SUAS CREDENCIAIS OFICIAIS DE ACESSO:
• Link de Acesso Direto: ${salonAccessUrl}
• Login (Seu CPF): ${createdSalon.ownerCpf}
• E-mail: ${createdSalon.ownerEmail}
• Token de Licença (Senha): ${createdSalon.purchaseToken}
• Vigência: ${createdSalon.planDays} Dias (Até ${createdSalon.expiresAt})

🎥 VÍDEO EXPLICATIVO (COMO USAR TODAS AS FERRAMENTAS):
👉 Assista ao vídeo tutorial aqui: https://www.youtube.com/watch?v=tutorial-agenda-facil-salao

📱 PASSO A PASSO PARA INSTALAR NO CELULAR E COMPUTADOR:
1. Abra o link do salão: ${salonAccessUrl}
2. No Android: toque nos 3 pontinhos e clique em "Instalar aplicativo" / "Adicionar à tela inicial".
3. No iPhone: toque em Compartilhar e selecione "Adicionar à Tela de Início".
4. Digite seu CPF e Token para acessar seu painel sempre que quiser.

✂️ COMO UTILIZAR AS FERRAMENTAS:
- Serviços: Cadastre cortes, barbas, químicas e valores.
- Equipe: Cadastre profissionais e comissões.
- Agenda: Visualize e receba agendamentos em tempo real.
- Caixa & Financeiro: Acompanhe entradas, saídas e formas de pagamento.
- Link do Cliente: Divulgue seu link para seus clientes agendarem sozinhos 24h por dia!

Guarde este e-mail para consultas futuras.`);

    window.open(`mailto:${createdSalon.ownerEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleShareWhatsappCredentials = () => {
    if (!createdSalon) return;
    const msg = `🎉 *PAGAMENTO CONFIRMADO - SEU SALÃO ESTÁ LIBERADO!*

Olá *${createdSalon.ownerName}*, seu acesso ao aplicativo *${createdSalon.name}* está pronto!

🔑 *Suas Credenciais:*
• *Login (CPF):* ${createdSalon.ownerCpf}
• *Token de Acesso:* ${createdSalon.purchaseToken}
• *Validade:* ${createdSalon.planDays} Dias (Até ${createdSalon.expiresAt})

🔗 *Link de Acesso Direto:*
👉 ${salonAccessUrl}

🎥 *Vídeo Tutorial (Como usar o sistema):*
👉 https://www.youtube.com/watch?v=tutorial-agenda-facil-salao

📲 *Como instalar no celular:*
1. Abra o link acima no Chrome ou Safari.
2. Clique em "Adicionar à Tela Principal / Instalar App".
3. Entre com seu CPF e Token para começar a gerenciar sua agenda, equipe e caixa!`;

    const cleanPhone = (createdSalon.ownerPhone || '').replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

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
            type="button"
            onClick={() => {
              try {
                window.close();
                window.open('', '_self', '');
                window.close();
              } catch (e) {}
              onClose();
            }}
            title="Fechar / Sair da Página"
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/15 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
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

            {/* Admin status notice */}
            {isUserAdmin && (
              <div className="bg-emerald-950/50 border border-emerald-500/40 p-2.5 rounded-2xl flex items-center gap-2 text-[11px] text-emerald-300 shadow-inner">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Acesso de Administrador Identificado:</strong> O teste de <strong>15 Dias Gratuitos está liberado sem limites</strong> para criar e testar salões quando necessário.
                </span>
              </div>
            )}

            {/* Plan Selector */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="font-black text-slate-200 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Escolha o Prazo da Licença do App:</span>
                </label>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 w-fit">
                  Pague e ative na hora ou use o teste grátis
                </span>
              </div>

              {/* Informative helper about skipping trial */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 text-[11px] text-slate-300 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Não é obrigatório usar o teste gratuito: você pode <strong>pular direto para os Planos Pagos (1, 2, 3 ou 4)</strong> e finalizar sua compra.
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                {availablePlans.map((p) => {
                  const isPlanTrial = p.numVal === 0;
                  const isDisabledTrial = isPlanTrial && isTrialAlreadyUsed;

                  return (
                    <button
                      key={`${p.days}-${p.numVal}`}
                      type="button"
                      disabled={isDisabledTrial}
                      onClick={() => {
                        if (!isDisabledTrial) {
                          setPlanDays(p.days);
                          setCardInstallments(1);
                        }
                      }}
                      title={
                        isDisabledTrial
                          ? `Período de teste gratuito de ${p.days} dias já foi utilizado por este CPF/salão.`
                          : isUserAdmin && isPlanTrial
                          ? `${p.days} Dias Gratuitos (Uso Ilimitado para Administradores)`
                          : `${p.label} - ${p.priceStr}`
                      }
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between select-none ${
                        isDisabledTrial
                          ? 'bg-slate-950/50 border-slate-800/60 text-slate-600 opacity-60 cursor-not-allowed'
                          : planDays === p.days && (isPlanTrial ? isTrialPlanSelected : !isTrialPlanSelected)
                          ? isPlanTrial
                            ? 'bg-sky-600/30 border-sky-400 text-white font-extrabold ring-2 ring-sky-400 shadow-md scale-[1.02]'
                            : 'bg-emerald-600/30 border-emerald-500 text-white font-extrabold ring-2 ring-emerald-500 shadow-md scale-[1.02]'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-black">{p.label}</span>
                        <span className={`block text-[11px] font-black mt-0.5 ${
                          isPlanTrial ? 'text-sky-400' : 'text-emerald-400'
                        }`}>
                          {p.priceStr}
                        </span>
                        <span className="block text-[9px] text-slate-400 mb-1">{p.detail}</span>
                      </div>
                      <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                        isDisabledTrial
                          ? 'bg-slate-900 text-slate-500 border-slate-800'
                          : isPlanTrial
                          ? isUserAdmin
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                            : 'bg-sky-950/90 text-sky-300 border-sky-500/40'
                          : p.days >= 180
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-amber-300 border-amber-500/30'
                      }`}>
                        {isDisabledTrial ? 'Já Utilizado' : isUserAdmin && isPlanTrial ? 'Ilimitado (Admin)' : p.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buyer Full Name */}
            <div>
              <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Nome Completo do Comprador:</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Souza"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Documents: CPF and RG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>CPF do Comprador (Seu Login):</span>
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>RG do Comprador:</span>
                </label>
                <input
                  type="text"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="00.000.000-0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seu E-mail (Acesso):</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telefone / WhatsApp:</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-8888"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Address Box */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <label className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  <span>Endereço do Salão / Localização para Relatório:</span>
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
                    Cidade:
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Estado (UF):
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    placeholder="SP"
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
                <span>Nome do Salão de Beleza / Barbearia:</span>
              </label>
              <input
                type="text"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                placeholder="Ex: Studio Elegance & Hair"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit to Payment or Free Trial Activation */}
            {isTrialPlanSelected ? (
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl shadow-blue-950/60 border border-sky-400/50 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Ativando seu teste gratuito...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>🚀 Iniciar Teste Gratuito de {configuredTrialDays} Dias (Sem Custo)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl shadow-emerald-950/60 border border-emerald-400/50 transition-all flex items-center justify-center gap-2 active:scale-95 mt-2 cursor-pointer"
              >
                <span>Avançar para Pagamento: {currentPlan.label} ({currentPlan.priceStr})</span>
                <CreditCard className="w-4 h-4 text-yellow-300" />
              </button>
            )}

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
                    <span>Pix Instantâneo (Crédito Direto na Conta do Administrador)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Confirmação Bancária
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
                      Abra o app do seu banco, escolha <strong>Pix</strong> e escaneie o QR Code ou copie o código abaixo:
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyPixEmv}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPixEmv ? 'Código Pix Copia e Cola Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>{copiedPix ? 'Chave Pix Copiada!' : `Copiar Chave (${adminPaymentConfig.chavePix})`}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* AUTOMATED BANK CONFIRMATION RADAR */}
                {bankOrderStatus === 'bank_confirmed' ? (
                  <div className="bg-emerald-950/90 border-2 border-emerald-400 p-4 rounded-2xl text-center space-y-2.5 shadow-2xl animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-sm sm:text-base">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>NOTIFICAÇÃO RECEBIDA: PAGAMENTO CONFIRMADO PELO BANCO!</span>
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                      O Banco Central / Gateway notificou e confirmou o crédito de <strong>{currentPlan.priceStr}</strong> na conta de <strong>{adminPaymentConfig.nomeBeneficiario}</strong>.
                    </p>
                    {bankReceipt?.bankReceiptCode && (
                      <div className="text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl text-emerald-400 border border-emerald-800/60 inline-block font-bold">
                        Código de Autorização Bancária: {bankReceipt.bankReceiptCode}
                      </div>
                    )}

                    {/* Botão Oficial Desbloqueado pelo Banco */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => executeSalonActivationAndAdvance(bankReceipt)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer border-2 border-emerald-400"
                      >
                        <Unlock className="w-5 h-5 text-white" />
                        <span>🔓 LIBERADO PELO BANCO: Acessar Meu Salão Agora</span>
                      </button>
                    </div>

                    <p className="text-xs text-amber-300 font-bold animate-bounce pt-1">
                      🚀 Avançando automaticamente para a liberação do seu Salão...
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900/90 border border-emerald-500/40 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span>Comunicação com o Banco Ativa (Aguardando Notificação)</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50 flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                        <span>Radar Bacen Conectado</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Abra o aplicativo do seu banco no celular e efetue o pagamento do QR Code Pix acima. <strong>Assim que o seu banco registrar o crédito de {currentPlan.priceStr} na conta de {adminPaymentConfig.nomeBeneficiario || 'Administrador'}, o banco enviará a notificação para o sistema e o seu salão será liberado instantaneamente.</strong>
                    </p>

                    {/* Indicador de Cadeado Fechado - Somente o banco pode liberar */}
                    <div className="bg-slate-950/90 border-2 border-slate-800 p-3.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center shadow-inner">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>🔒 Cadeado Fechado: Aguardando Notificação de Pagamento do Banco</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">
                        O sistema não possui botão de liberação manual. O acesso é desbloqueado e fica verde exclusivamente quando a confirmação for recebida da rede bancária.
                      </p>
                    </div>

                    {/* Instruções Oficiais de Segurança Bancária */}
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Validação Bancária em Tempo Real</span>
                      </div>
                      <p className="leading-relaxed">
                        O valor a ser creditado é <strong>{currentPlan.priceStr}</strong> diretamente na conta oficial. A comunicação entre o banco e o aplicativo opera 24 horas por dia.
                      </p>
                    </div>

                    {/* Ferramenta de Teste de Webhook (Apenas para Testes/Administração) */}
                    {(userRole === 'admin' || isAdminCpf(cpf) || Boolean(getUrlParam('teste-banco'))) && (
                      <div className="pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={handleSimulateBankPixDeposit}
                          disabled={isSimulatingPix || isAutoAdvancing}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-[10px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                          <span>🧪 [Ambiente de Teste Adm] Simular Notificação Webhook do Banco Central</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

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

                {/* Radar Bancário Ativo para Cartão */}
                <div className="bg-slate-900/90 border border-blue-500/40 p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-black text-xs">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                      <span>Comunicação Bancária com a Operadora Ativa</span>
                    </div>
                    <span className="text-[10px] text-blue-400/90 font-mono bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/50 flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse text-blue-400" />
                      <span>Gateway Conectado</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Preencha os dados do cartão abaixo e envie para a operadora bancária. <strong>Assim que a operadora e o banco confirmarem o débito e o crédito na conta de {adminPaymentConfig.nomeBeneficiario || 'Administrador'}, o banco enviará a notificação de aprovação e o seu salão será liberado instantaneamente.</strong>
                  </p>
                </div>

                {cardError && (
                  <div className="bg-rose-950/90 border border-rose-600 text-rose-200 p-2.5 rounded-xl text-xs font-bold">
                    {cardError}
                  </div>
                )}

                {/* Card Number */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1 text-xs">Número do Cartão de Crédito:</label>
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
                  <label className="block text-slate-300 font-bold mb-1 text-xs">Nome impresso no Cartão:</label>
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
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Validade:</label>
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
                    <label className="block text-slate-300 font-bold mb-1 text-xs">CVV:</label>
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
                    <label className="block text-slate-300 font-bold mb-1 text-xs">Parcelamento:</label>
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
                          <option value="2">2x de R$ {((currentPlan.numVal || 0) / 2).toFixed(2).replace('.', ',')} (Sem juros)</option>
                          <option value="3">3x de R$ {((currentPlan.numVal || 0) / 3).toFixed(2).replace('.', ',')} (Sem juros)</option>
                          <option value="4">4x de R$ {(((currentPlan.numVal || 0) * 1.05) / 4).toFixed(2).replace('.', ',')} (c/ juros)</option>
                          <option value="5">5x de R$ {(((currentPlan.numVal || 0) * 1.07) / 5).toFixed(2).replace('.', ',')} (c/ juros)</option>
                          <option value="6">6x de R$ {(((currentPlan.numVal || 0) * 1.09) / 6).toFixed(2).replace('.', ',')} (c/ juros)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Card Confirmation Status or Action Button */}
                {bankOrderStatus === 'bank_confirmed' ? (
                  <div className="bg-emerald-950/90 border-2 border-emerald-400 p-4 rounded-2xl text-center space-y-2.5 shadow-2xl animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-sm sm:text-base">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>AUTORIZAÇÃO BANCÁRIA CONFIRMADA: CARTÃO APROVADO!</span>
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                      O valor de <strong>{currentPlan.priceStr}</strong> foi processado e creditado com sucesso na conta do Administrador (<strong>{adminPaymentConfig.nomeBeneficiario}</strong>).
                    </p>
                    {bankReceipt?.bankReceiptCode && (
                      <div className="text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl text-emerald-400 border border-emerald-800/60 inline-block font-bold">
                        Código de Autorização Bancária: {bankReceipt.bankReceiptCode}
                      </div>
                    )}
                    <p className="text-xs text-amber-300 font-bold animate-bounce pt-1">
                      🚀 Avançando automaticamente para a liberação do seu Salão...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {/* Indicador de Cadeado Fechado - Somente o banco pode liberar */}
                    <div className="bg-slate-950/90 border-2 border-slate-800 p-3.5 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center shadow-inner">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>🔒 Cadeado Fechado: Aguardando Autorização e Notificação do Banco</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm">
                        O salão só é liberado quando a operadora bancária processar a cobrança e notificar a aprovação do crédito.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleProcessCardPayment}
                      disabled={isProcessingCard || isAutoAdvancing}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-blue-400/40"
                    >
                      {isProcessingCard ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Comunicando com o Banco e Validando Notificação de Crédito...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-blue-200" />
                          <span>Processar Cartão com a Operadora Bancária</span>
                        </>
                      )}
                    </button>

                    {/* Ferramenta de Teste de Webhook para Cartão (Ambiente de Testes) */}
                    {adminPaymentConfig.ativarAmbienteTestes && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleSimulateBankPixDeposit}
                          disabled={isSimulatingPix || isAutoAdvancing}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-[10px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                          <span>🧪 [Ambiente de Teste Adm] Simular Notificação Webhook da Operadora de Cartão</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* STEP 3: UNIFIED ACCESS SCREEN WITH GENERATED CPF + TOKEN + STEP-BY-STEP */}
        {step === 'success' && (
          <div className="p-4 sm:p-6 text-center space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400/50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10 animate-bounce text-emerald-400" />
            </div>

            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/40 inline-block mb-1.5 shadow-sm">
                🎉 Teste Gratuito de 15 Dias Ativado!
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Seu Salão Foi Cadastrado e Seu Acesso Liberado!
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                Salão: <strong className="text-emerald-400 font-bold">{createdSalon?.name}</strong> • Titular: <strong className="text-white font-bold">{createdSalon?.ownerName}</strong>
              </p>
            </div>

            {/* Layout de Descrição Explicativa */}
            <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 p-4 rounded-2xl border-2 border-sky-400/70 max-w-md mx-auto text-left shadow-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-extrabold uppercase tracking-wide">
                  Instruções de Acesso ao Salão:
                </h4>
              </div>
              <p className="text-xs text-sky-100 leading-relaxed font-medium">
                Para entrar no sistema de gestão, <strong>é necessário adicionar o seu CPF e o TOKEN gerados abaixo</strong> na tela de acesso. Você pode copiar e colar nos campos correspondentes ou utilizar o botão de acesso rápido para entrar imediatamente.
              </p>
            </div>

            {/* Quadro de Credenciais com Botões de Cópia Rápida */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/70 max-w-md mx-auto text-left space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Suas Credenciais Oficiais:</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Liberado 15 Dias ✓
                </span>
              </div>

              {/* CPF Box */}
              <div className="bg-slate-900/95 p-3.5 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-2 shadow-inner">
                <div>
                  <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">
                    1. SEU CPF DE ACESSO (LOGIN):
                  </span>
                  <span className="text-base sm:text-lg font-black text-sky-400 font-mono tracking-wide">
                    {createdSalon?.ownerCpf || '000.000.000-00'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    (Titular: {createdSalon?.ownerName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCpf}
                  className="bg-sky-950 hover:bg-sky-900 text-sky-300 text-xs font-bold px-3 py-2 rounded-xl border border-sky-600/50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCpf ? 'Copiado!' : 'Copiar CPF'}</span>
                </button>
              </div>

              {/* Token Box */}
              <div className="bg-slate-900/95 p-3.5 rounded-2xl border-2 border-emerald-500/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
                <div>
                  <span className="text-[10px] text-emerald-300 block font-black uppercase tracking-wider">
                    2. SEU TOKEN DE LICENÇA (SENHA):
                  </span>
                  <div className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-wider">
                    {createdSalon?.purchaseToken}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedToken ? 'Token Copiado!' : 'Copiar Token'}</span>
                </button>
              </div>

              {/* Link Direto */}
              <div className="bg-teal-950/60 p-3 rounded-2xl border border-teal-600/40 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-teal-300 font-black uppercase">
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>LINK DIRETO DO SALÃO:</span>
                  </span>
                  {copiedAccessLink && <span className="text-emerald-400">Copiado!</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={salonAccessUrl}
                    className="w-full bg-slate-900/90 border border-teal-600/40 rounded-xl px-2.5 py-1.5 text-xs text-teal-100 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyAccessLink}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Detalhes do Plano */}
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-[11px] space-y-1">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Salão Cadastrado:</span>
                  <span className="font-bold text-pink-300">{createdSalon?.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Validade do Teste:</span>
                  <span className="font-black text-emerald-400">15 Dias (Até {createdSalon?.expiresAt})</span>
                </div>
              </div>
            </div>

            {/* Video Tutorial Explicativo Banner */}
            <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-rose-950/90 p-4 rounded-2xl border-2 border-red-500/70 max-w-md mx-auto text-left shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300">
                  <Video className="w-5 h-5 text-rose-400 shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-wide">
                    Vídeo Explicativo do Sistema:
                  </h4>
                </div>
                <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold border border-red-500/30">
                  Tutorial Passo a Passo
                </span>
              </div>
              <p className="text-xs text-rose-100/90 leading-relaxed">
                Assista ao vídeo explicativo com tela do salão, voz do narrador e demonstração de todos os comandos e vantagens:
              </p>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>▶ Assistir ao Vídeo Explicativo na Tela (Com Áudio & Telas)</span>
                </button>

                <a
                  href="https://www.youtube.com/watch?v=tutorial-agenda-facil-salao"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                  <span>Abrir link de exemplo no YouTube</span>
                </a>
              </div>
            </div>

            {/* Passo a Passo Completo de Instalação e Utilização das Ferramentas */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/40 max-w-md mx-auto text-left space-y-3 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black text-sky-300 uppercase tracking-wide">
                  Passo a Passo de Instalação & Uso:
                </h4>
              </div>

              {/* 1. Como Instalar no Celular */}
              <div className="space-y-1">
                <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block">
                  📱 Como Instalar no seu Celular:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Android (Chrome):</strong> Abra o link do salão, toque nos 3 pontinhos do navegador e escolha <em>"Instalar aplicativo"</em> ou <em>"Adicionar à tela inicial"</em>.<br />
                  • <strong>iPhone (Safari):</strong> Abra o link, toque no botão de Compartilhar (ícone do quadrado com a setinha) e clique em <em>"Adicionar à Tela de Início"</em>.
                </p>
              </div>

              {/* 2. Como Utilizar as Ferramentas */}
              <div className="space-y-1 border-t border-slate-900 pt-2">
                <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider block">
                  ✂️ Como Utilizar as Ferramentas do Salão:
                </span>
                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc leading-relaxed">
                  <li><strong>Serviços:</strong> Cadastre serviços com valor e duração.</li>
                  <li><strong>Equipe:</strong> Adicione barbeiros/cabeleireiros e porcentagem de comissão.</li>
                  <li><strong>Agenda em Tempo Real:</strong> Controle horários e novos agendamentos.</li>
                  <li><strong>Caixa & Financeiro:</strong> Acompanhe faturamento diário em Pix, Cartão e Dinheiro.</li>
                  <li><strong>Link do Cliente:</strong> Compartilhe o link do seu salão no WhatsApp e Instagram para seus clientes agendarem 24h por dia sozinhos!</li>
                </ul>
              </div>
            </div>

            {/* Tela de Acesso Integrada (Formulário Direto com CPF e Token) */}
            <div className="bg-[#0b1222] border-2 border-emerald-500/80 p-4 sm:p-5 rounded-3xl max-w-md mx-auto text-left space-y-3 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    Tela de Acesso ao Painel do Salão
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Copie e cole ou acesse diretamente com os dados preenchidos abaixo.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    CPF do Proprietário:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={createdSalon?.ownerCpf || ''}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyCpf}
                      className="absolute right-2 top-1.5 text-[10px] bg-slate-800 text-sky-300 font-bold px-2 py-0.5 rounded-lg border border-slate-700 hover:bg-slate-700"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Token de Licença:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={createdSalon?.purchaseToken || ''}
                      className="w-full bg-slate-950 border border-emerald-500/60 rounded-xl px-3 py-2 text-emerald-400 font-mono text-xs font-bold select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="absolute right-2 top-1.5 text-[10px] bg-emerald-950 text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-600 hover:bg-emerald-900"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão Principal de Acesso Direto */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSalonAuth) {
                    onOpenSalonAuth({
                      cpf: createdSalon?.ownerCpf,
                      token: createdSalon?.purchaseToken
                    });
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl text-xs sm:text-sm shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-1"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>Entrar no Painel do Salão (Acessar Agora) ➔</span>
              </button>
            </div>

            {/* Botões de Apoio: Compartilhar WhatsApp & E-mail */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto pt-1">
              <button
                type="button"
                onClick={handleShareWhatsappCredentials}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-200" />
                <span>Enviar no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllInfo}
                className="bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold py-2 px-3 rounded-xl text-[11px] flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shadow"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedAllInfo ? 'Copiado!' : 'Copiar Tudo'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEmailClient}
                className="bg-blue-900 hover:bg-blue-800 text-blue-200 font-bold py-2 px-3 rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Abrir E-mail</span>
              </button>
            </div>

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

        {/* Interactive Video Tutorial Modal */}
        <VideoTutorialModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          salonName={createdSalon?.name || salonName || 'Salão'}
          ownerName={createdSalon?.ownerName || name || 'Proprietário'}
        />

      </div>
    </div>
  );
};
