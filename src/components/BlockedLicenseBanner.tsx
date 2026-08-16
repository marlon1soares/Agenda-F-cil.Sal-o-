import React from 'react';
import { 
  ShieldAlert, Clock, ShoppingCart, Lock, AlertTriangle, 
  CheckCircle2, Sparkles, User, FileText, ChevronRight 
} from 'lucide-react';
import { SalonApp } from '../types';
import { SalonLicenseInfo } from '../utils/license';
import { formatBRL } from '../utils/pricing';
import { Storage } from '../utils/storage';

interface BlockedLicenseBannerProps {
  salon: SalonApp;
  licenseInfo: SalonLicenseInfo;
  onOpenBuyApp: () => void;
  isAdmin?: boolean;
}

export const BlockedLicenseBanner: React.FC<BlockedLicenseBannerProps> = ({
  salon,
  licenseInfo,
  onOpenBuyApp,
  isAdmin = false,
}) => {
  const adminPaymentConfig = Storage.getAdminPaymentConfig();
  const minPrice = formatBRL(adminPaymentConfig.precoPlano30Dias || 30);

  // If active and not expired, display warning badge only if trial is ending in 3 days or less
  if (!licenseInfo.isExpiredOrBlocked) {
    if (licenseInfo.isTrial) {
      return (
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-600/40 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/40 text-blue-300">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="font-extrabold text-blue-200 block">
                Período de Teste Gratuito (15 Dias): 
                <span className="text-amber-300 ml-1 font-black">
                  Restam {licenseInfo.daysRemaining} {licenseInfo.daysRemaining === 1 ? 'dia' : 'dias'}
                </span>
              </span>
              <span className="text-[10px] text-slate-400">
                A partir do 16º dia o sistema será bloqueado e exigirá contratação de plano.
              </span>
            </div>
          </div>

          <button
            onClick={onOpenBuyApp}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all shrink-0 active:scale-95 border border-emerald-400/40"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden sm:inline">Comprar Licença Definitiva</span>
            <span className="sm:hidden">Comprar</span>
          </button>
        </div>
      );
    }
    return null;
  }

  // BLOCKED / EXPIRED FULL SCREEN OVERLAY
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-rose-500/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-200">
        
        {/* Header Alert */}
        <div className="bg-gradient-to-r from-rose-900 via-red-800 to-slate-900 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl border-2 border-rose-400/60 mx-auto flex items-center justify-center mb-3 shadow-lg">
            <Lock className="w-8 h-8 text-rose-300 animate-pulse" />
          </div>
          
          <span className="bg-rose-950/90 text-rose-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-500/40">
            Acesso Bloqueado • 16º Dia Atingido
          </span>

          <h2 className="text-xl font-black mt-2 text-white">
            {licenseInfo.isTrial 
              ? 'Período Gratuito de 15 Dias Expirado'
              : 'Sua Licença de Acesso Expirou'}
          </h2>

          <p className="text-xs text-rose-200/90 mt-1 max-w-md mx-auto">
            {licenseInfo.isTrial
              ? `Os 15 dias gratuitos para o CPF ${salon.ownerCpf || 'cadastrado'} foram concluídos. A partir do 16º dia, o aplicativo é bloqueado e a liberação ocorre mediante a compra de uma licença.`
              : `O plano de uso para "${salon.name}" venceu em ${licenseInfo.formattedExpiresAt}. Para continuar utilizando e atendendo seus clientes, adquira um plano de renovação.`}
          </p>
        </div>

        {/* Info Box */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* CPF Notice */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span className="text-slate-400">Salão / Barbearia:</span>
              <strong className="text-white">{salon.name}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span className="text-slate-400">Proprietário (CPF):</span>
              <strong className="text-sky-300 font-mono">{salon.ownerCpf || 'Não informado'}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-xs">
              <span className="text-slate-400">Regra de Teste Gratuito:</span>
              <span className="text-amber-400 font-bold">1 Única Vez por CPF</span>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-black text-amber-300 mb-0.5">Como reativar seu acesso:</strong>
              Escolha um dos planos disponíveis (30 dias, 3 meses, 6 meses ou 1 ano). Assim que o pagamento for confirmado, seu salão será liberado instantaneamente com todos os seus agendamentos, clientes e configurações intactos.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={onOpenBuyApp}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-xl shadow-emerald-950/60 border border-emerald-400/50 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <ShoppingCart className="w-4 h-4 text-yellow-300" />
              <span>Ver Planos & Comprar Licença Agora</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
            
            <div className="text-center text-[10px] text-slate-500 pt-1">
              Planos a partir de <strong className="text-emerald-400">{minPrice}/mês</strong> via Pix e Cartão de Crédito em até 6x
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
