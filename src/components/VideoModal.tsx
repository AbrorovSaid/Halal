import React, { useEffect } from 'react';
import { X, ExternalLink, HardDrive, Truck, Beef, Scale, Calendar, CheckCircle2 } from 'lucide-react';
import { ShiftReport } from '../types/shift';

interface VideoModalProps {
  shift: ShiftReport | null;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ shift, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!shift) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>Видеофиксация смены: {shift.date}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {shift.brigade} • Мастер: {shift.supervisorName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="bg-black aspect-video flex items-center justify-center relative">
          {shift.videoUrl ? (
            <video
              src={shift.videoUrl}
              controls
              autoPlay
              className="w-full h-full max-h-[60vh] object-contain"
            />
          ) : shift.driveFileUrl ? (
            <div className="text-center p-6 space-y-3">
              <p className="text-sm text-slate-300">Видео сохранено на Google Диске</p>
              <a
                href={shift.driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть видео в Google Диске</span>
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Видеозапись недоступна</p>
          )}
        </div>

        {/* Shift Details Summary */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <p className="text-slate-400 flex items-center justify-center gap-1">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>Машин</span>
              </p>
              <p className="text-base font-bold text-white mt-0.5">{shift.trucksLoaded} шт.</p>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <p className="text-slate-400 flex items-center justify-center gap-1">
                <Beef className="w-3.5 h-3.5 text-amber-500" />
                <span>Быков</span>
              </p>
              <p className="text-base font-bold text-amber-400 mt-0.5">{shift.bullsSlaughtered} гол.</p>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <p className="text-slate-400 flex items-center justify-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-400" />
                <span>Мясо</span>
              </p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">
                {shift.meatWeightTons} т ({shift.meatWeightKg.toLocaleString()} кг)
              </p>
            </div>
          </div>

          {shift.truckDetails && (
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Номера машин:</span>{' '}
              {shift.truckDetails}
            </p>
          )}

          {shift.notes && (
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Замечания:</span> {shift.notes}
            </p>
          )}

          {shift.driveFileUrl && (
            <div className="pt-2 flex justify-end">
              <a
                href={shift.driveFileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Открыть исходный файл на Google Диске</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
