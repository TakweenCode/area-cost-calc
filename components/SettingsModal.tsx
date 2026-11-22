import React, { useEffect } from 'react';
import { CloseIcon, TelegramIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs no-print"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 id="settings-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
            الإعدادات والمعلومات
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="إغلاق النافذة"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* 1. Developer Contact */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              التواصل مع المطوّر
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              للملاحظات والاقتراحات والاستفسارات أو طلب تطبيقك الخاص.
            </p>
            <a
              href="https://t.me/salehapp"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[44px] px-4 py-2.5 rounded-lg bg-[#229ED9] hover:bg-[#1b8cc2] text-white text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <TelegramIcon className="w-5 h-5 shrink-0" />
              <span>تواصل عبر تيليجرام</span>
              <span dir="ltr" className="font-mono text-xs bg-white/15 px-2 py-0.5 rounded">
                @salehapp
              </span>
            </a>
          </section>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* 2. Disclaimer */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              إخلاء المسؤولية
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              تُقدَّم جميع الحسابات والأسعار ونسب الهدر الافتراضية في هذه الحاسبة لأغراض التقدير
              والتخطيط المبدئي فقط، ولا تُعد عرض سعر رسمياً أو التزاماً تعاقدياً. قد تختلف التكلفة
              الفعلية تبعاً للقياسات الميدانية الدقيقة، واختلاف أسعار الموردين، وجودة المواد، وأجور
              النقل والتركيب، والضرائب المطبقة. يُنصح بالتحقق من الكميات والأسعار النهائية مع
              المختصين أو المورد المعتمد قبل الشراء أو التنفيذ، ولا يتحمل المطوّر أي مسؤولية عن أي
              قرارات مالية أو فروقات في التكاليف الفعلية.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
