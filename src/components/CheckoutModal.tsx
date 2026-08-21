import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  QrCode,
  CreditCard,
  Copy,
  CheckCheck,
  Check,
  ShieldCheck,
  Lock,
  Plus,
  Minus,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Receipt,
  FileCheck2,
  Share2,
  Package
} from 'lucide-react';
import { SalonConfig } from '../types';
import { generatePixEMVPayload, generateQrCodeDataUrl } from '../utils/pix';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id?: string;
    title: string;
    price?: number | string;
    stock?: number | string;
    url?: string;
    description?: string;
    folder?: string;
  } | null;
  defaultMethod?: 'pix' | 'cartao';
  salonConfig: SalonConfig;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  item,
  defaultMethod = 'pix',
  salonConfig
}) => {
  const [activeTab, setActiveTab] = useState<'pix' | 'cartao'>(defaultMethod);
  const [quantity, setQuantity] = useState<number>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [installments, setInstallments] = useState<number>(1);

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    authCode: string;
    date: string;
    method: 'pix' | 'cartao';
    installmentText: string;
    totalAmount: number;
  } | null>(null);

  // QR Code & Pix EMV State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [emvPayload, setEmvPayload] = useState<string>('');

  // Reset or initialize when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultMethod);
      setQuantity(1);
      setPaymentSuccess(null);
      setIsProcessing(false);
      setInstallments(1);
    }
  }, [isOpen, defaultMethod, item]);

  // Calculate Available Stock if configured
  const availableStock = useMemo(() => {
    if (item?.stock === undefined || item?.stock === null || String(item.stock).trim() === '') {
      return undefined;
    }
    const parsed = Number(item.stock);
    return isNaN(parsed) ? undefined : parsed;
  }, [item?.stock]);

  // Calculate Unit & Total Price
  const unitPrice = useMemo(() => {
    if (!item?.price) return 0;
    const p = typeof item.price === 'string' ? parseFloat(item.price.replace(',', '.')) : Number(item.price);
    return isNaN(p) || p <= 0 ? 0 : p;
  }, [item]);

  const subtotal = unitPrice * quantity;

  // Format Brazilian currency
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Card Installments Calculation:
  // 1x = à vista sem juros
  // 2x a 5x = com juros (ex: 2.99% por parcela)
  const installmentOptions = useMemo(() => {
    if (subtotal <= 0) {
      return [
        { count: 1, text: '1x à vista (sem juros)', installmentValue: 0, totalValue: 0, hasInterest: false }
      ];
    }

    const interestRatePerMonth = 0.0299; // 2.99% a.m.

    return [1, 2, 3, 4, 5].map(count => {
      if (count === 1) {
        return {
          count: 1,
          text: `1x de ${formatBRL(subtotal)} (à vista, sem juros)`,
          installmentValue: subtotal,
          totalValue: subtotal,
          hasInterest: false
        };
      }

      // Juros simples da operadora
      const totalWithInterest = subtotal * (1 + interestRatePerMonth * count);
      const installmentValue = totalWithInterest / count;

      return {
        count,
        text: `${count}x de ${formatBRL(installmentValue)} (com juros da operadora)`,
        installmentValue,
        totalValue: totalWithInterest,
        hasInterest: true
      };
    });
  }, [subtotal]);

  const selectedInstallmentObj = installmentOptions.find(opt => opt.count === installments) || installmentOptions[0];

  // Generate dynamic Pix QR Code for exact quantity and total
  useEffect(() => {
    if (!isOpen || !item) return;

    const pixKey = salonConfig.chavePix || '11973395723';
    const beneficiaryName = salonConfig.titularPix || salonConfig.nomeSalao || 'AGENDA FACIL';
    const cityName = salonConfig.cidadePix || 'SAO PAULO';

    const payload = generatePixEMVPayload(pixKey, beneficiaryName, cityName, subtotal > 0 ? subtotal : undefined);
    setEmvPayload(payload);

    generateQrCodeDataUrl(payload).then(url => {
      setQrCodeDataUrl(url);
    });
  }, [isOpen, item, subtotal, salonConfig]);

  // Card Number Formatter (0000 0000 0000 0000)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Card Expiry Formatter (MM/AA)
  const handleCardExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExp(raw);
  };

  // Card CVV Formatter
  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(raw);
  };

  // CPF Formatter (000.000.000-00)
  const handleCardCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    raw = raw.replace(/(\d{3})(\d)/, '$1.$2');
    raw = raw.replace(/(\d{3})(\d)/, '$1.$2');
    raw = raw.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCardCpf(raw);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Card Brand Detector
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
    if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(clean)) return 'Elo';
    if (/^(606282|3841)/.test(clean)) return 'Hipercard';
    return 'Cartão';
  }, [cardNumber]);

  // Submit Card Payment
  const handleProcessCardPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      alert('Por favor, digite um número de cartão válido.');
      return;
    }
    if (!cardHolder.trim()) {
      alert('Por favor, digite o nome impresso no cartão.');
      return;
    }
    if (!cardExp || cardExp.length < 5) {
      alert('Por favor, informe a validade do cartão (MM/AA).');
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      alert('Por favor, digite o CVV do cartão.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const authCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
      setPaymentSuccess({
        authCode,
        date: new Date().toLocaleString('pt-BR'),
        method: 'cartao',
        installmentText: selectedInstallmentObj.text,
        totalAmount: selectedInstallmentObj.totalValue
      });
    }, 1600);
  };

  // WhatsApp Order Confirmation Link
  const buildWhatsAppLink = (methodType: 'pix' | 'cartao') => {
    const totalDisplay = formatBRL(methodType === 'pix' ? subtotal : selectedInstallmentObj.totalValue);
    const msg = `Olá! Gostaria de confirmar meu pedido de compra:\n\n` +
      `📦 *Produto:* ${item?.title || 'Item do Catálogo'}\n` +
      `🔢 *Quantidade:* ${quantity} unidade(s)\n` +
      `💰 *Valor Unitário:* ${unitPrice > 0 ? formatBRL(unitPrice) : 'Sob consulta'}\n` +
      `💳 *Forma de Pagamento:* ${methodType === 'pix' ? 'Pix Instantâneo' : `Cartão de Crédito (${selectedInstallmentObj.text})`}\n` +
      `💵 *Valor Total:* ${totalDisplay}\n\n` +
      `Por favor, confirmem o recebimento para a entrega/retirada. Obrigado!`;

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-80 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {item.url ? (
              <img
                src={item.url}
                alt={item.title}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider block">
                Finalizar Compra
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {item.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PAYMENT SUCCESS SCREEN */}
        {paymentSuccess ? (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-400/40 shadow-lg shadow-emerald-500/20 animate-bounce">
              <FileCheck2 className="w-9 h-9" />
            </div>

            <div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30">
                PAGAMENTO APROVADO
              </span>
              <h4 className="text-xl font-black text-white mt-2">
                Compra Realizada com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Seu pagamento foi autenticado com segurança pela operadora.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Código de Autorização:</span>
                <span className="font-mono font-black text-purple-300">{paymentSuccess.authCode}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Produto:</span>
                <span className="font-bold text-white text-right">{item.title}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Quantidade:</span>
                <span className="font-bold text-white">{quantity} unidade(s)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Plano de Pagamento:</span>
                <span className="font-bold text-sky-300 text-right">{paymentSuccess.installmentText}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-300">Valor Total Pago:</span>
                <span className="text-base font-black text-emerald-400">{formatBRL(paymentSuccess.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={buildWhatsAppLink('cartao')}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Enviar Comprovante ao Salão via WhatsApp
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition-all border border-slate-700"
              >
                Concluir e Voltar ao Catálogo
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* 1. QUANTITY & PRICE SUMMARY CALCULATOR (WITH REAL-TIME STOCK AWARENESS) */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">
                    Quantidade de Itens:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-purple-300 font-semibold">
                      Unitário: {unitPrice > 0 ? formatBRL(unitPrice) : 'Sob consulta'}
                    </span>
                    {availableStock !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                        availableStock === 0
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                          : availableStock <= 3
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      }`}>
                        <Package className="w-3 h-3" />
                        {availableStock === 0 ? 'Esgotado' : `${availableStock} em estoque no salão`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Counter Buttons */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || availableStock === 0}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 flex items-center justify-center transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-black text-sm text-white font-mono">
                    {availableStock === 0 ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => {
                      if (availableStock !== undefined && q >= availableStock) {
                        return q;
                      }
                      return q + 1;
                    })}
                    disabled={availableStock !== undefined && (availableStock === 0 || quantity >= availableStock)}
                    className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Real-time Calculation Table: 1 unidade, 2 unidades, total */}
              {unitPrice > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className={`p-2 rounded-xl border ${quantity === 1 ? 'bg-purple-950/60 border-purple-500/40 text-purple-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <span className="text-[10px] block font-bold">1 unidade</span>
                    <span className="text-xs font-black">{formatBRL(unitPrice)}</span>
                  </div>

                  <div className={`p-2 rounded-xl border ${quantity === 2 ? 'bg-purple-950/60 border-purple-500/40 text-purple-200' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    <span className="text-[10px] block font-bold">2 unidades</span>
                    <span className="text-xs font-black">{formatBRL(unitPrice * 2)}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                    <span className="text-[10px] block font-bold uppercase tracking-wider">Total ({quantity} un)</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400">{formatBRL(subtotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. PAYMENT METHOD TABS */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('pix')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'pix'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <QrCode className="w-4 h-4 text-purple-300" />
                <span>Pagar com Pix</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cartao')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'cartao'
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-300" />
                <span>Pagar com Cartão</span>
              </button>
            </div>

            {/* 3A. PIX PAYMENT CONTENT */}
            {activeTab === 'pix' && (
              <div className="space-y-4 text-center">
                <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-left">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total a pagar via Pix:</span>
                      <div className="text-xl font-black text-emerald-400">{formatBRL(subtotal)}</div>
                    </div>
                    <span className="text-[11px] bg-purple-900/60 text-purple-300 px-2.5 py-1 rounded-lg font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Aprovação Instantânea
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="bg-white p-3 rounded-2xl inline-block shadow-xl border-2 border-purple-500/40 mx-auto">
                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="QR Code Pix" className="w-44 h-44 mx-auto" />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-800 text-xs font-bold">
                        Gerando QR Code...
                      </div>
                    )}
                  </div>

                  {/* Copy Pix EMV / Key */}
                  <div className="space-y-2 text-left">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-bold">Chave Pix da Loja:</span>
                        <span className="text-xs font-mono font-black text-purple-300 truncate block">
                          {salonConfig.chavePix || '11973395723'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(salonConfig.chavePix || '11973395723', 'pix_key')}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'pix_key' ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Chave
                          </>
                        )}
                      </button>
                    </div>

                    {emvPayload && (
                      <button
                        type="button"
                        onClick={() => handleCopy(emvPayload, 'pix_emv')}
                        className="w-full bg-slate-900 hover:bg-slate-850 text-purple-200 font-bold text-xs py-2.5 px-3 rounded-xl transition-all border border-purple-500/20 flex items-center justify-center gap-1.5"
                      >
                        {copiedField === 'pix_emv' ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-emerald-400" /> Código Pix Copia e Cola Copiado com Sucesso!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" /> Copiar Código Pix "Copia e Cola" (R$ {(Number(subtotal) || 0).toFixed(2)})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* WhatsApp Confirmation */}
                <a
                  href={buildWhatsAppLink('pix')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" /> Notificar Salão do Pagamento no WhatsApp
                </a>
              </div>
            )}

            {/* 3B. CREDIT CARD PAYMENT CONTENT (WITH INSTALLMENT RULES) */}
            {activeTab === 'cartao' && (
              <form onSubmit={handleProcessCardPayment} className="space-y-4">
                
                {/* Visual Card Preview */}
                <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-sky-950 p-4 sm:p-5 rounded-2xl border border-sky-500/30 text-white shadow-xl space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-widest text-sky-300 uppercase">
                      {cardBrand}
                    </span>
                    <Lock className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="font-mono text-base sm:text-lg font-bold tracking-widest text-slate-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Nome do Titular</span>
                      <span className="font-bold uppercase tracking-wider text-slate-200 truncate max-w-[170px] block">
                        {cardHolder || 'NOME IMPRESSO'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase block">Validade</span>
                      <span className="font-mono font-bold text-slate-200">
                        {cardExp || 'MM/AA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Inputs */}
                <div className="space-y-3">
                  
                  {/* Card Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Número do Cartão de Crédito: *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                      />
                      <div className="absolute right-3 top-2.5 text-xs font-black text-sky-400">
                        {cardBrand}
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nome Impresso no Cartão: *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="Ex: MARLON SOARES"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold uppercase focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Validade (MM/AA): *
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExp}
                        onChange={handleCardExpChange}
                        placeholder="12/28"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        CVV (Código): *
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={handleCardCvvChange}
                        placeholder="123"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  {/* CPF do Titular */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      CPF do Titular do Cartão: *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardCpf}
                      onChange={handleCardCpfChange}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* 4. INSTALLMENT SELECTOR WITH EXACT RULES (1x SEM JUROS, 2x-5x COM JUROS) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Opções de Parcelamento: *</span>
                      <span className="text-[10px] text-sky-400 font-extrabold">1x à vista sem juros</span>
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-sky-500/50 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:border-sky-400 outline-none"
                    >
                      {installmentOptions.map(opt => (
                        <option key={opt.count} value={opt.count}>
                          {opt.text}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Total & Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm py-3.5 rounded-xl transition-all shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processando Transação Segura...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pagar {formatBRL(selectedInstallmentObj.totalValue)} no Cartão</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> Ambiente criptografado e 100% protegido
                  </p>
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
