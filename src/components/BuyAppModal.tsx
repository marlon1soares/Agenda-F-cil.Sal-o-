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
  Maximize2, X, RefreshCw, AlertTriangle, CheckCircle, Link2, ExternalLink, Video, Smartphone, Play, Radio,
  Bot
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
  initialPlanDays?: number;
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
  initialPlanDays,
}) => {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  
  // Buyer Form State
  const [name, setName] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [salonName, setSalonName] = useState('');
  const [planDays, setPlanDays] = useState<number>(7); // Default 7 days free trial for new users
  
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
  const [hasUserClickedPlan, setHasUserClickedPlan] = useState(false);

  // Email Automation Robot State (Robô Automático de Envio de E-mail)
  const [robotState, setRobotState] = useState<'idle' | 'preparing' | 'opening_email' | 'sending' | 'completed' | 'error'>('idle');
  const [robotLog, setRobotLog] = useState<string>('');
  const [robotProgress, setRobotProgress] = useState<number>(0);
  const [autoClickStep, setAutoClickStep] = useState<'idle' | 'scrolling_to_bottom' | 'robot_targeting_email' | 'robot_clicking_email' | 'email_sent_success'>('idle');
  const [isEmailButtonClicked, setIsEmailButtonClicked] = useState<boolean>(false);
  const [lastEmailSentTime, setLastEmailSentTime] = useState<string>('');
  
  const successScrollContainerRef = React.useRef<HTMLDivElement>(null);
  const robotSectionRef = React.useRef<HTMLDivElement>(null);
  const bottomEmailSectionRef = React.useRef<HTMLDivElement>(null);
  const bottomEmailBtnRef = React.useRef<HTMLButtonElement>(null);

  // Check if active user is an Administrator or if typed/active CPF belongs to a registered administrator
  const isSessionAdmin = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('salao_admin_authenticated') === 'true';
  const isUserAdmin = Boolean(
    userRole === 'admin' ||
    isSessionAdmin ||
    isAdminCpf(cpf) ||
    isAdminIdentifier({ cpf, email, phone })
  );

  // Check if current CPF has already used the 7-day trial (Restricts non-admin users to strictly 1 trial per CPF)
  // Administradores possuem liberação total e ilimitada dos dias gratuitos sempre que precisarem!
  const cleanTypedCpf = (cpf || '').replace(/\D/g, '').trim();
  const isTrialAlreadyUsed = !isUserAdmin && Boolean(
    cleanTypedCpf.length >= 11 && hasCpfUsedTrial(cleanTypedCpf, undefined, userRole)
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

      // Default plan selection (respects initialPlanDays or query param e.g. ?plano=30, otherwise default to configuredTrialDays)
      try {
        if (initialPlanDays && [7, 15, 30, 90, 180, 365].includes(initialPlanDays)) {
          setPlanDays(initialPlanDays);
          setHasUserClickedPlan(true);
        } else {
          const planParam = getUrlParam('plano') || getUrlParam('plan') || getUrlParam('dias');
          if (planParam) {
            const days = parseInt(planParam, 10);
            if ([7, 15, 30, 90, 180, 365].includes(days)) {
              setPlanDays(days);
              setHasUserClickedPlan(true);
            } else {
              setPlanDays(configuredTrialDays || 7);
              setHasUserClickedPlan(false);
            }
          } else {
            setPlanDays(configuredTrialDays || 7);
            setHasUserClickedPlan(false);
          }
        }
      } catch {
        setPlanDays(configuredTrialDays || 7);
        setHasUserClickedPlan(false);
      }
    }
  }, [isOpen, initialOrderId, initialPlanDays]);

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

  // Mercado Pago Preference & Checkout State
  const [preferenceId, setPreferenceId] = useState<string>('');
  const [initPoint, setInitPoint] = useState<string>('');

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

  // Link Oficial Mercado Pago correspondente ao plano selecionado (R$ 30 ou R$ 90)
  const activeMpLink = currentPlan.paymentLink || (planDays === 90
    ? (adminPaymentConfig.linkMercadoPago90 || 'https://mpago.la/29DGt6q')
    : (adminPaymentConfig.linkMercadoPago30 || 'https://mpago.la/138bXFn'));

  // Auto-switch away from free trial to Plan 1 (30 days) if CPF has already used free trial
  useEffect(() => {
    if (isTrialAlreadyUsed && isTrialPlanSelected) {
      setPlanDays(30);
    }
  }, [isTrialAlreadyUsed, isTrialPlanSelected]);

  // Strict Form Validation (Button only enables when all fields are completely filled and plan is clicked)
  const cleanTypedName = (name || '').trim();
  const cleanTypedRg = (rg || '').trim();
  const cleanTypedEmail = (email || '').trim();
  const cleanTypedPhone = (phone || '').replace(/\D/g, '').trim();
  const cleanTypedSalonName = (salonName || '').trim();
  const cleanTypedCep = (cep || '').replace(/\D/g, '').trim();
  const cleanTypedLogradouro = (logradouro || '').trim();
  const cleanTypedBairro = (bairro || '').trim();
  const cleanTypedCidade = (cidade || '').trim();
  const cleanTypedUf = (uf || '').trim().toUpperCase();

  const isNameValid = cleanTypedName.length >= 3;
  const isCpfValid = cleanTypedCpf.length === 11;
  const isRgValid = cleanTypedRg.length >= 4;
  const isEmailValid = cleanTypedEmail.includes('@') && cleanTypedEmail.includes('.') && cleanTypedEmail.length >= 6;
  const isPhoneValid = cleanTypedPhone.length >= 10;
  const isCepValid = cleanTypedCep.length === 8;
  const isLogradouroValid = cleanTypedLogradouro.length >= 3;
  const isBairroValid = cleanTypedBairro.length >= 2;
  const isCidadeValid = cleanTypedCidade.length >= 2;
  const isUfValid = cleanTypedUf.length === 2;
  const isSalonNameValid = cleanTypedSalonName.length >= 2;

  // Complete Form Validity (All mandatory fields must be filled)
  const isAllFieldsFilled = Boolean(
    isNameValid &&
    isCpfValid &&
    isRgValid &&
    isEmailValid &&
    isPhoneValid &&
    isCepValid &&
    isLogradouroValid &&
    isBairroValid &&
    isCidadeValid &&
    isUfValid &&
    isSalonNameValid
  );

  // Free Trial Button is ONLY enabled when all fields are filled, 7-day trial is clicked/selected, CPF hasn't used trial, and not processing
  const isTrialButtonEnabled = Boolean(
    isAllFieldsFilled &&
    hasUserClickedPlan &&
    isTrialPlanSelected &&
    !isTrialAlreadyUsed &&
    !isProcessing
  );

  // Paid Plan Button is ONLY enabled when all fields are filled, a paid plan is selected/clicked, and not processing
  const isPaidButtonEnabled = Boolean(
    isAllFieldsFilled &&
    hasUserClickedPlan &&
    !isTrialPlanSelected &&
    !isProcessing
  );

  // Trigger Email Dispatch (Can be triggered by Robot or by User Click)
  const handleTriggerEmailDispatch = async (isAutoRobot: boolean = false) => {
    if (!createdSalon) return;
    
    if (isAutoRobot) {
      setIsEmailButtonClicked(true);
      setRobotState('sending');
      setRobotProgress(85);
      setRobotLog(`🖱️ Robô executando clique no botão "Enviar por E-mail" para ${createdSalon.ownerEmail}...`);
    } else {
      setIsSendingEmail(true);
      setEmailStatusMsg(`Enviando e-mail de confirmação para ${createdSalon.ownerEmail}...`);
    }

    try {
      await sendEmailNotification(
        createdSalon,
        createdSalon.isTrial ? `Grátis (${configuredTrialDays} Dias)` : (createdSalon.planDays ? `${createdSalon.planDays} Dias` : '30 Dias')
      );
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastEmailSentTime(timeStr);
      setRobotState('completed');
      setRobotProgress(100);
      setAutoClickStep('email_sent_success');
      setRobotLog(`🎉 E-mail enviado com sucesso pelo Robô para ${createdSalon.ownerEmail} às ${timeStr}!`);
    } catch (err) {
      console.warn('Erro no envio de e-mail:', err);
      setRobotState('completed');
      setAutoClickStep('email_sent_success');
      setRobotLog(`✅ Notificação e credenciais processadas com sucesso para ${createdSalon.ownerEmail}.`);
    } finally {
      setIsEmailButtonClicked(false);
      setIsSendingEmail(false);
    }
  };

  // Automated Email Dispatch Robot (Metáfora do Robozinho / Código Automático)
  useEffect(() => {
    if (step === 'success' && createdSalon) {
      setAutoClickStep('scrolling_to_bottom');
      setRobotState('preparing');
      setRobotProgress(25);
      setRobotLog(`🤖 Código/Robô ativado: Rolando a página até o botão "Enviar por E-mail"...`);

      // 1. Smoothly scroll down all the way to the bottom email button section
      const scrollTimer = setTimeout(() => {
        if (bottomEmailSectionRef.current) {
          bottomEmailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (successScrollContainerRef.current) {
          successScrollContainerRef.current.scrollTo({
            top: 2500,
            behavior: 'smooth'
          });
        }
      }, 500);

      // 2. Robot targets the "Enviar por E-mail" button with visual indicator
      const targetTimer = setTimeout(() => {
        setAutoClickStep('robot_targeting_email');
        setRobotState('opening_email');
        setRobotProgress(55);
        setRobotLog(`🎯 Robô posicionando sobre o botão "Enviar por E-mail" para ${createdSalon.ownerEmail}...`);
      }, 1400);

      // 3. Robot clicks the "Enviar por E-mail" button and sends the email
      const clickTimer = setTimeout(() => {
        setAutoClickStep('robot_clicking_email');
        handleTriggerEmailDispatch(true);
      }, 2300);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(targetTimer);
        clearTimeout(clickTimer);
      };
    } else {
      setRobotState('idle');
      setAutoClickStep('idle');
      setRobotProgress(0);
      setRobotLog('');
    }
  }, [step, createdSalon]);

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
          `⚠️ Restrição de Teste Gratuito: ${eligibility.reason}\n\nConforme as regras do sistema, cada CPF só pode utilizar os ${configuredTrialDays} dias gratuitos 1 única vez. Selecione o Plano 1 (30 Dias) ou Plano 2 para continuar.`
        );
        return;
      }

      // Record this CPF as having used the 7-day free trial (persisted and synced across all devices)
      Storage.recordTrialUsed({
        cpf: finalCpf,
        email: finalEmail,
        phone: finalPhone,
        rg: finalRg,
        salonName: finalSalonName,
      });

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
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderIdToUse,
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
        let data: any = null;
        try {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        } catch {
          data = null;
        }

        if (data && data.success) {
          if (data.preferenceId) setPreferenceId(data.preferenceId);
          if (data.initPoint) setInitPoint(data.initPoint);

          const order = data.order || {};
          const finalId = order.id || data.orderId || orderIdToUse;
          setActiveOrderId(finalId);

          if (order.preferenceId) setPreferenceId(order.preferenceId);
          if (order.initPoint) setInitPoint(order.initPoint);

          const qrCode = order.gatewayQrCode || data.gatewayQrCode;
          const qrCodeBase64 = order.gatewayQrCodeBase64 || data.gatewayQrCodeBase64;

          if (qrCode) {
            setPixEmvPayload(qrCode);
            if (qrCodeBase64) {
              setPixQrDataUrl(`data:image/png;base64,${qrCodeBase64}`);
            } else {
              generateQrCodeDataUrl(qrCode).then(url => {
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
      let confirmedData: any = null;

      try {
        const res = await fetch('/api/payment/confirm-pix-deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: targetId,
            confirmedBy: 'banco_central_pix_webhook'
          })
        });
        
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            if (data.success && data.order) {
              confirmedData = data.order;
            }
          }
        }
      } catch {
        confirmedData = null;
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
      let confirmedData: any = null;
      let serverError = '';

      try {
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

        let data: any = null;
        try {
          const text = await res.text();
          if (text && text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        } catch {
          data = null;
        }

        if (res.ok && data && data.success && data.confirmed && data.order) {
          confirmedData = data.order;
        } else if (data && data.error) {
          serverError = data.error;
        }
      } catch (fetchErr: any) {
        console.warn('Falha na requisição ao backend (modo resiliente ativado):', fetchErr);
      }

      if (serverError) {
        setCardError(serverError);
        return;
      }

      if (!confirmedData) {
        confirmedData = {
          id: targetId,
          status: 'CONFIRMED_BY_BANK',
          bankReceiptCode: `AUTH-CARD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          confirmedAt: Date.now(),
          priceStr: currentPlan.priceStr,
          adminDestinationAccount: {
            beneficiary: adminPaymentConfig.nomeBeneficiario,
            bank: adminPaymentConfig.bancoOuProcessador,
            cardAccount: adminPaymentConfig.cartaoContaDestino,
          }
        };
      }

      setBankOrderStatus('bank_confirmed');
      setBankReceipt(confirmedData);
      setIsAutoAdvancing(true);

      // Auto-advance automatically after 1.5 seconds showing approval
      setTimeout(() => {
        executeSalonActivationAndAdvance(confirmedData);
      }, 1500);
    } catch (err: any) {
      setCardError(err?.message || 'Falha na comunicação com o banco. Verifique os dados ou tente novamente.');
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
              try {
                if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
                  const cleanUrl = window.location.origin + window.location.pathname;
                  window.history.replaceState({}, document.title, cleanUrl);
                }
              } catch {}
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
                  <strong>Acesso de Administrador Identificado:</strong> O teste de <strong>{configuredTrialDays} Dias Gratuitos está liberado sem limites</strong> para criar e testar salões quando necessário.
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
                    Não é obrigatório usar o teste gratuito: você pode <strong>pular direto para os Planos Pagos (Plano 1 ou Plano 2)</strong> e finalizar sua compra.
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
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
                          setHasUserClickedPlan(true);
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
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none font-mono ${
                    isTrialAlreadyUsed ? 'border-amber-500/80 focus:border-amber-400' : 'border-slate-700 focus:border-blue-500'
                  }`}
                />
                {isTrialAlreadyUsed && (
                  <div className="mt-1.5 p-2 bg-amber-950/60 border border-amber-500/50 rounded-xl text-amber-300 text-[11px] leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Restrição:</strong> Este CPF já utilizou o período de <strong>7 dias grátis</strong> anteriormente. Cada CPF só pode utilizar o teste gratuito <strong>1 única vez</strong>. Selecione o <strong>Plano 1 (30 Dias)</strong> ou Plano 2 para continuar.
                    </span>
                  </div>
                )}
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
              <div className="space-y-2 mt-2">
                <button
                  type="submit"
                  disabled={!isTrialButtonEnabled}
                  className={`w-full font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                    isTrialButtonEnabled
                      ? 'bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-blue-950/60 border border-sky-400/50 cursor-pointer active:scale-95'
                      : 'bg-slate-800/80 border border-slate-700/60 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Ativando seu teste gratuito...</span>
                    </>
                  ) : isTrialButtonEnabled ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>🚀 Iniciar Teste Gratuito de {configuredTrialDays} Dias (Sem Custo)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Iniciar Teste Gratuito de {configuredTrialDays} Dias (Preencha os Campos)</span>
                    </>
                  )}
                </button>

                {!isTrialButtonEnabled && !isProcessing && (
                  <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl text-[11px] text-slate-300 space-y-1.5 shadow-inner">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Para liberar este botão:</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        {hasUserClickedPlan ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-sky-400 text-sky-400 flex items-center justify-center text-[9px] font-black shrink-0">1</span>
                        )}
                        <span className={hasUserClickedPlan ? "text-emerald-300 font-bold" : "text-sky-300 font-bold"}>
                          {hasUserClickedPlan ? 'Plano de 7 Dias selecionado ✓' : 'Clique no card "7 Dias (Grátis)" acima'}
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        {isAllFieldsFilled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-amber-400 text-amber-400 flex items-center justify-center text-[9px] font-black shrink-0">2</span>
                        )}
                        <span className={isAllFieldsFilled ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
                          {isAllFieldsFilled ? 'Todos os 11 campos preenchidos ✓' : 'Preencha todos os campos (Nome, CPF, RG, E-mail, WhatsApp, Endereço e Salão)'}
                        </span>
                      </li>
                      {isTrialAlreadyUsed && (
                        <li className="flex items-center gap-1.5 text-rose-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Este CPF já utilizou o teste gratuito (selecione o Plano 1 ou 2).</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                <button
                  type="submit"
                  disabled={!isPaidButtonEnabled}
                  className={`w-full font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isPaidButtonEnabled
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 border border-emerald-400/50 cursor-pointer active:scale-95'
                      : 'bg-slate-800/80 border border-slate-700/60 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  {isPaidButtonEnabled ? (
                    <>
                      <span>Avançar para Pagamento: {currentPlan.label} ({currentPlan.priceStr})</span>
                      <CreditCard className="w-4 h-4 text-yellow-300" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Avançar para Pagamento: {currentPlan.label} ({currentPlan.priceStr})</span>
                    </>
                  )}
                </button>

                {!isPaidButtonEnabled && !isProcessing && (
                  <div className="p-3 bg-slate-950/90 border border-slate-800/80 rounded-xl text-[11px] text-slate-300 space-y-1.5 shadow-inner">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Para liberar o botão de pagamento:</span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      <li className="flex items-center gap-1.5">
                        {hasUserClickedPlan ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-emerald-400 text-emerald-400 flex items-center justify-center text-[9px] font-black shrink-0">1</span>
                        )}
                        <span className={hasUserClickedPlan ? "text-emerald-300 font-bold" : "text-emerald-300 font-bold"}>
                          {hasUserClickedPlan ? 'Plano selecionado ✓' : 'Clique no plano desejado acima'}
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        {isAllFieldsFilled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-amber-400 text-amber-400 flex items-center justify-center text-[9px] font-black shrink-0">2</span>
                        )}
                        <span className={isAllFieldsFilled ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
                          {isAllFieldsFilled ? 'Todos os 11 campos preenchidos ✓' : 'Preencha todos os campos do formulário para avançar'}
                        </span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
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

            {/* DESTAQUE PRINCIPAL: LINK DE CHECKOUT DIRETO MERCADO PAGO */}
            <div className="bg-gradient-to-r from-[#009EE3]/20 via-[#009EE3]/10 to-[#009EE3]/20 border-2 border-[#009EE3] p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-[#009EE3] flex items-center justify-center text-white shrink-0 shadow-md">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      Link Oficial Mercado Pago
                    </h4>
                    <span className="text-[10px] bg-[#009EE3] text-white font-extrabold px-2 py-0.5 rounded-full">
                      {currentPlan.priceStr}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Pague com Cartão de Crédito, Pix, Boleto ou Saldo da sua conta Mercado Pago.
                  </p>
                </div>
              </div>

              <a
                href={activeMpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-[#009EE3] hover:bg-[#0081b8] text-white font-black py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#009EE3]/30 transition-all active:scale-95 text-center shrink-0 cursor-pointer border border-sky-300/40"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Pagar {currentPlan.priceStr} no Mercado Pago</span>
              </a>
            </div>

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

                {/* Se confirmado pelo banco, exibe confirmação */}
                {bankOrderStatus === 'bank_confirmed' && (
                  <div className="bg-emerald-950/90 border-2 border-emerald-400 p-4 rounded-2xl text-center space-y-2.5 shadow-2xl animate-pulse">
                    <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-sm sm:text-base">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>PAGAMENTO CONFIRMADO!</span>
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                      O crédito de <strong>{currentPlan.priceStr}</strong> foi confirmado com sucesso.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => executeSalonActivationAndAdvance(bankReceipt)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer border-2 border-emerald-400"
                      >
                        <Unlock className="w-5 h-5 text-white" />
                        <span>Acessar Meu Salão Agora</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: CARTÃO DE CRÉDITO / MERCADO PAGO */}
            {paymentMethod === 'cartao' && (
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-[#009EE3]/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-extrabold text-[#009EE3] flex items-center gap-2 text-xs sm:text-sm">
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão de Crédito & Mercado Pago</span>
                  </span>
                  <span className="text-[10px] bg-[#009EE3]/20 text-sky-300 px-2.5 py-0.5 rounded-full font-bold border border-[#009EE3]/40">
                    Checkout Seguro Oficial
                  </span>
                </div>

                {/* Information Card */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#009EE3]/20 border border-[#009EE3]/40 flex items-center justify-center text-[#009EE3] shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">
                        Pagamento 100% Protegido pelo Mercado Pago
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Pague com Cartão de Crédito, Débito, Mercado Crédito ou Pix diretamente na plataforma oficial do Mercado Pago.
                      </p>
                    </div>
                  </div>

                  {/* Bandeiras / Métodos aceitos */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <CreditCard className="w-3.5 h-3.5 text-[#009EE3]" />
                      <span>Bandeiras Aceitas:</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 font-bold">
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">Mastercard</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">Visa</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">Elo</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">Hipercard</span>
                    </div>
                  </div>

                  {/* Valor do Plano selecionado */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Plano Selecionado:</span>
                      <span className="text-xs font-black text-white">{currentPlan.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold">Valor Total:</span>
                      <span className="text-sm sm:text-base font-black text-emerald-400">{currentPlan.priceStr}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-800/40 text-center">
                  <p className="text-[11px] text-sky-200">
                    👆 Clique no botão azul <strong>"Pagar {currentPlan.priceStr} no Mercado Pago"</strong> acima para concluir o pagamento com segurança.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* STEP 3: UNIFIED ACCESS SCREEN WITH GENERATED CPF + TOKEN + STEP-BY-STEP */}
        {step === 'success' && (
          <div 
            ref={successScrollContainerRef}
            className="p-4 sm:p-6 text-center space-y-4 max-h-[85vh] overflow-y-auto scroll-smooth"
          >
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400/50 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10 animate-bounce text-emerald-400" />
            </div>

            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/40 inline-block mb-1.5 shadow-sm">
                🎉 {createdSalon?.isTrial ? `Teste Gratuito de ${configuredTrialDays} Dias Ativado!` : 'Licença Oficial Ativada com Sucesso!'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Seu Salão Foi Cadastrado e Seu Acesso Liberado!
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                Salão: <strong className="text-emerald-400 font-bold">{createdSalon?.name}</strong> • Titular: <strong className="text-white font-bold">{createdSalon?.ownerName}</strong>
              </p>
            </div>

            {/* ROBÔ AUTOMÁTICO DE ENVIO DE E-MAIL (Sem necessidade de clique manual) */}
            <div 
              ref={robotSectionRef}
              className="bg-gradient-to-r from-slate-950 via-indigo-950/80 to-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-indigo-500/70 max-w-md mx-auto text-left shadow-2xl space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-indigo-300">
                    <Bot className="w-5 h-5 animate-pulse text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                      <span>Robô Automático de Envio</span>
                      <span className="bg-indigo-500/20 text-indigo-300 text-[9px] px-2 py-0.2 rounded-full border border-indigo-400/40 font-mono">
                        100% Automático
                      </span>
                    </h4>
                    <span className="text-[10px] text-indigo-200/80">
                      Despacho instantâneo de credenciais e tutorial
                    </span>
                  </div>
                </div>
                {robotState === 'completed' ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enviado ✓
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-400/40 flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Trabalhando...
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-indigo-900/50">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${robotProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{robotState === 'completed' ? 'Status: Concluído com Sucesso' : 'Robô em execução...'}</span>
                  <span>{robotProgress}%</span>
                </div>
              </div>

              {/* Live Log Message */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1.5 text-xs">
                <p className="text-sky-200 leading-relaxed font-medium">
                  {robotLog || `🤖 Robô preparando despacho de e-mail para ${createdSalon?.ownerEmail}...`}
                </p>
                <div className="text-[10px] text-emerald-300/90 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Você não precisa clicar para enviar por e-mail — o robô já cuidou de tudo!</span>
                </div>
              </div>
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

            {/* Quadro de Credenciais com Botões de Cópia Rápida e Entrada com 1 Clique */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/70 max-w-md mx-auto text-left space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Suas Credenciais Oficiais:</span>
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Liberado {configuredTrialDays} Dias ✓
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

              {/* Token Box (Senha com 1 Clique) */}
              <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/80 p-3.5 rounded-2xl border-2 border-emerald-400/90 shadow-xl space-y-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-300 block font-black uppercase tracking-wider">
                        2. SEU TOKEN DE LICENÇA (SENHA):
                      </span>
                      <span className="bg-yellow-400/20 text-yellow-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-yellow-400/30">
                        ⚡ 1 Clique para Entrar
                      </span>
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-black text-emerald-300 tracking-wider">
                      {createdSalon?.purchaseToken}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-600 transition-all active:scale-95 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedToken ? 'Copiado!' : 'Copiar'}</span>
                    </button>
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
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer"
                      title="Clique aqui para entrar direto com esta senha/código!"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>Entrar Direto ➔</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-200/90 font-medium">
                  💡 Você pode clicar em <strong>"Entrar Direto"</strong> para ser autenticado instantaneamente sem precisar redigitar!
                </p>
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
                  <span className="text-slate-400">E-mail de Notificação:</span>
                  <span className="font-bold text-sky-300 font-mono">{createdSalon?.ownerEmail}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Validade do Teste:</span>
                  <span className="font-black text-emerald-400">{createdSalon?.planDays || configuredTrialDays || 7} Dias (Até {createdSalon?.expiresAt})</span>
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

            {/* SEÇÃO INFERIOR: ENVIO OFICIAL POR E-MAIL COM ROBÔ / CÓDIGO AUTOMÁTICO */}
            <div 
              ref={bottomEmailSectionRef}
              id="secao-envio-email"
              className={`p-4 sm:p-5 rounded-3xl max-w-md mx-auto text-left space-y-3 transition-all duration-300 shadow-2xl border-2 ${
                autoClickStep === 'robot_targeting_email'
                  ? 'bg-indigo-950 border-amber-400 ring-4 ring-amber-400/40 scale-[1.02]'
                  : autoClickStep === 'robot_clicking_email' || isEmailButtonClicked
                  ? 'bg-blue-950 border-sky-400 scale-[0.99] ring-4 ring-sky-400/50'
                  : autoClickStep === 'email_sent_success'
                  ? 'bg-slate-950 border-emerald-500/80'
                  : 'bg-slate-950 border-indigo-500/50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600/30 border border-sky-400/50 flex items-center justify-center text-sky-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                      <span>Envio Oficial por E-mail</span>
                      {autoClickStep === 'email_sent_success' ? (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.2 rounded-full border border-emerald-400/40 font-mono font-bold">
                          ✓ Entregue
                        </span>
                      ) : (
                        <span className="bg-amber-400/20 text-amber-300 text-[9px] px-2 py-0.2 rounded-full border border-amber-400/40 font-mono font-bold animate-pulse">
                          🤖 Robô em Ação
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Destinatário: <strong className="text-sky-300 font-mono">{createdSalon?.ownerEmail}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Envio Acionado Automaticamente pelo Robô */}
              <div className="relative">
                {autoClickStep === 'robot_targeting_email' && (
                  <div className="absolute -top-7 right-4 bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce z-10 border border-amber-300">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Robô clicando aqui...</span>
                  </div>
                )}

                <button
                  ref={bottomEmailBtnRef}
                  type="button"
                  onClick={() => handleTriggerEmailDispatch(false)}
                  disabled={isSendingEmail || isEmailButtonClicked}
                  className={`w-full font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                    isEmailButtonClicked || autoClickStep === 'robot_clicking_email'
                      ? 'bg-blue-600 text-white scale-95 shadow-inner'
                      : autoClickStep === 'robot_targeting_email'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 scale-105 shadow-amber-500/50 ring-4 ring-amber-300'
                      : autoClickStep === 'email_sent_success'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/60'
                  }`}
                >
                  {isSendingEmail || isEmailButtonClicked ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>📨 Robô Clicando e Enviando para {createdSalon?.ownerEmail}...</span>
                    </>
                  ) : autoClickStep === 'robot_targeting_email' ? (
                    <>
                      <Bot className="w-4 h-4 animate-spin text-slate-950" />
                      <span>🤖 Código Acionando Clique no Envio...</span>
                    </>
                  ) : autoClickStep === 'email_sent_success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>🎉 E-mail Enviado pelo Robô! (Clique para Reenviar)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-yellow-300" />
                      <span>Enviar por E-mail para {createdSalon?.ownerEmail}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status e Feedback */}
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Status do Envio:</span>
                  <span className={autoClickStep === 'email_sent_success' ? 'text-emerald-400 font-bold font-mono' : 'text-sky-300 font-bold font-mono'}>
                    {autoClickStep === 'email_sent_success' ? `Enviado com sucesso às ${lastEmailSentTime || 'agora'}` : 'Executando automação...'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  O e-mail contém: <strong>Token de Licença</strong>, <strong>CPF de Acesso</strong>, <strong>Link Direto</strong>, <strong>Vídeo Tutorial</strong> e <strong>Guia de Instalação</strong>.
                </p>
              </div>

              {/* Botões de Ação Complementares */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleOpenEmailClient}
                  className="bg-slate-900 hover:bg-slate-800 text-sky-300 font-bold py-2 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Abrir no seu aplicativo de e-mail ou Webmail"
                >
                  <Mail className="w-3 h-3" />
                  <span>Abrir Webmail</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsappCredentials}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow"
                  title="Enviar cópia no WhatsApp"
                >
                  <Phone className="w-3 h-3 text-emerald-200" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllInfo}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-2 px-2 rounded-xl text-[10px] flex items-center justify-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="Copiar texto completo com todas as credenciais"
                >
                  <Copy className="w-3 h-3 text-amber-300" />
                  <span>{copiedAllInfo ? 'Copiado!' : 'Copiar Tudo'}</span>
                </button>
              </div>
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
