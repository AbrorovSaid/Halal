import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send, ExternalLink, ShieldCheck } from 'lucide-react';
import { ShiftReport } from '../types/shift';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedShift?: ShiftReport | null;
  totalShiftsCount: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  selectedShift,
  totalShiftsCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build the shareable boss URL
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = selectedShift
    ? `${baseUrl}?view=boss&shiftId=${selectedShift.id}`
    : `${baseUrl}?view=boss`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.getElementById('share-link-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  // Pre-formatted message for chat
  const chatMessage = selectedShift
    ? `Здравствуйте! Отчёт по смене за ${selectedShift.date} готов:
• Машин загружено: ${selectedShift.trucksLoaded} шт.
• Быков забито: ${selectedShift.bullsSlaughtered} гол.
• Вес мяса: ${selectedShift.meatWeightTons} т (${selectedShift.meatWeightKg} кг)
• Видеозапись прикреплена

Посмотреть отчёт и видео:
${shareUrl}`
    : `Здравствуйте! Направляю сводный отчёт по смене забойного цеха и отгрузкам (всего смен: ${totalShiftsCount}). Вы можете просмотреть все данные, видеозаписи и отсортировать показатели по ссылке:
${shareUrl}`;

  const sendToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(chatMessage)}`, '_blank');
  };

  const sendToWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(chatMessage)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Ссылка для начальника</h3>
              <p className="text-xs text-slate-400">
                Начальник перейдёт по ссылке и сразу увидит отчёт и видео
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            По этой ссылке открывается специальный режим отчёта: начальник сможет сортировать
            данные по датам, машинам, быкам, весу мяса, воспроизводить видеозаписи и скачивать сводные
            таблицы.
          </p>

          {/* Copy Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Прямая ссылка на отчёт:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="share-link-input"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-mono focus:outline-none select-all"
              />
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          {/* Quick Messengers Sharing */}
          <div className="pt-2">
            <span className="block text-xs font-semibold text-slate-400 mb-2">
              Быстрая отправка в мессенджеры:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={sendToTelegram}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-800/40 text-xs font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Отправить в Telegram</span>
              </button>
              <button
                onClick={sendToWhatsApp}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-800/40 text-xs font-medium transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Отправить в WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Preview of message */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            {chatMessage}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
