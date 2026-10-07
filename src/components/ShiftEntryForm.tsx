import React, { useState, useRef } from 'react';
import {
  Truck,
  Beef,
  Scale,
  Video,
  Upload,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  HardDrive,
  Share2,
  Trash2,
  Play
} from 'lucide-react';
import { ShiftReport } from '../types/shift';

interface ShiftEntryFormProps {
  onSaveShift: (
    shiftData: Omit<ShiftReport, 'id' | 'createdAt' | 'updatedAt' | 'verifiedByBoss' | 'verifiedAt'>,
    videoFile: File | null
  ) => Promise<{ success: boolean; shift?: ShiftReport; error?: string }>;
  isDriveConnected: boolean;
  onOpenShareModal: (shift?: ShiftReport) => void;
}

export const ShiftEntryForm: React.FC<ShiftEntryFormProps> = ({
  onSaveShift,
  isDriveConnected,
  onOpenShareModal,
}) => {
  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [brigade, setBrigade] = useState<string>('Бригада №1 (Ашраф А.)');
  const [supervisorName, setSupervisorName] = useState<string>('Ашраф Аброров');
  const [trucksLoaded, setTrucksLoaded] = useState<number>(4);
  const [bullsSlaughtered, setBullsSlaughtered] = useState<number>(42);
  const [meatWeightKg, setMeatWeightKg] = useState<number>(13440);
  const [truckDetails, setTruckDetails] = useState<string>('КамАЗ 712 (3.2 т), МАН 890 (3.4 т), Вольво 430 (3.4 т), КамАЗ 115 (3.44 т)');
  const [notes, setNotes] = useState<string>('Забой проведён в штатном режиме. Ветеринарный контроль пройден, полутуши заклеймены и охлаждены до +2°C.');

  // Video State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdShift, setCreatedShift] = useState<ShiftReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed metrics
  const meatWeightTons = Math.round((meatWeightKg / 1000) * 100) / 100;
  const avgMeatPerBullKg =
    bullsSlaughtered > 0 ? Math.round((meatWeightKg / bullsSlaughtered) * 10) / 10 : 0;

  // Handle Video Selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 250 * 1024 * 1024) {
        alert('Размер видео превышает 250 МБ. Пожалуйста, выберите более короткую запись.');
        return;
      }
      setVideoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(objectUrl);
    }
  };

  const removeVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (trucksLoaded < 0 || bullsSlaughtered < 0 || meatWeightKg < 0) {
      alert('Показатели не могут быть отрицательными');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setStatusMessage('Сохранение смены и подготовка файлов...');

    try {
      const result = await onSaveShift(
        {
          date,
          brigade,
          supervisorName,
          trucksLoaded,
          bullsSlaughtered,
          meatWeightKg,
          meatWeightTons,
          avgMeatPerBullKg,
          truckDetails,
          notes,
          videoFileName: videoFile?.name,
          videoFileSize: videoFile?.size,
          syncedToDrive: isDriveConnected,
        },
        videoFile
      );

      if (result.success && result.shift) {
        setCreatedShift(result.shift);
        setStatusMessage('Смена успешно зафиксирована и отправлена в отчёт!');
      } else {
        alert(result.error || 'Ошибка при сохранении отчёта');
      }
    } catch (err: any) {
      alert('Ошибка: ' + (err.message || 'Сбой отправки'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleResetFormForNextShift = () => {
    setCreatedShift(null);
    removeVideo();
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Success banner after saving */}
      {createdShift && (
        <div className="mb-6 p-6 bg-emerald-950/70 border border-emerald-600/50 rounded-2xl shadow-xl text-white animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-emerald-300">
                  Смена за {createdShift.date} успешно сохранена!
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Загружено машин: <b>{createdShift.trucksLoaded}</b> • Забито быков:{' '}
                  <b>{createdShift.bullsSlaughtered}</b> • Мясо:{' '}
                  <b>{createdShift.meatWeightTons} т ({createdShift.meatWeightKg.toLocaleString()} кг)</b>
                </p>
                {createdShift.syncedToDrive && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <HardDrive className="w-3.5 h-3.5" />
                    Сохранено на вашем Google Диске в папке отчётов
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenShareModal(createdShift)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm transition-colors shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Отправить начальнику</span>
              </button>
              <button
                type="button"
                onClick={handleResetFormForNextShift}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
              >
                + Новая смена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Form Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/30 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                <Beef className="w-6 h-6 text-amber-500" />
                <span>Внесение данных по рабочей смене</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Фиксация забоя скота, погрузки автомобилей, выхода продукции и видеоотчёта
              </p>
            </div>

            {/* Google Drive Status Pill */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                isDriveConnected
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>
                {isDriveConnected
                  ? 'Google Диск подключен'
                  : 'Google Диск не подключен (сохранится в базу)'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Shift Metadata Row: Date, Brigade, Supervisor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Дата смены</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Brigade */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Бригада цеха</span>
              </label>
              <input
                type="text"
                value={brigade}
                onChange={(e) => setBrigade(e.target.value)}
                placeholder="Бригада №1"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Supervisor Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Мастер / Бригадир</span>
              </label>
              <input
                type="text"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="ФИО бригадира"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Core Production Numbers: Trucks, Bulls, Meat Weight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* 1. Trucks Loaded */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-400" />
                  Машин загружено
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 font-semibold border border-sky-800/40">
                  Авто / Фуры
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setTrucksLoaded((v) => Math.max(0, v - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-transform"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min="0"
                    value={trucksLoaded}
                    onChange={(e) => setTrucksLoaded(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-transparent text-center font-black text-3xl sm:text-4xl text-white focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">машин отгружено</p>
                </div>

                <button
                  type="button"
                  onClick={() => setTrucksLoaded((v) => v + 1)}
                  className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-transform shadow-md shadow-sky-900/30"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-850">
                {[1, 2, 5].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTrucksLoaded((v) => v + amt)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Bulls Slaughtered */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Beef className="w-4 h-4 text-amber-500" />
                  Быков забито
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 font-semibold border border-amber-800/40">
                  Голов скота
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setBullsSlaughtered((v) => Math.max(0, v - 1))}
                  className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-transform"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min="0"
                    value={bullsSlaughtered}
                    onChange={(e) =>
                      setBullsSlaughtered(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-full bg-transparent text-center font-black text-3xl sm:text-4xl text-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">голов за смену</p>
                </div>

                <button
                  type="button"
                  onClick={() => setBullsSlaughtered((v) => v + 1)}
                  className="w-11 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center font-bold text-lg active:scale-95 transition-transform shadow-md shadow-amber-900/30"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-850">
                {[5, 10, 20].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBullsSlaughtered((v) => v + amt)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Meat Weight (Kg & Tons) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  Мясо (кг / тонны)
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-800/40">
                  {meatWeightTons} тонн
                </span>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={meatWeightKg}
                    onChange={(e) => setMeatWeightKg(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-right font-black text-2xl text-emerald-400 focus:outline-none focus:border-emerald-500 pr-12"
                  />
                  <span className="absolute right-3.5 top-3 text-sm font-semibold text-slate-400">
                    кг
                  </span>
                </div>

                {/* Auto Calculated Live Indicators */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Тоннаж</p>
                    <p className="text-sm font-bold text-emerald-400">{meatWeightTons} т</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Ср. вес на быка</p>
                    <p className="text-sm font-bold text-amber-400">{avgMeatPerBullKg} кг</p>
                  </div>
                </div>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-850">
                {[500, 1000, 3000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMeatWeightKg((v) => v + amt)}
                    className="px-2.5 py-1 text-xs rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium"
                  >
                    +{amt} кг
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Details & Inspection Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Номера машин / Марки / Накладные (для отчёта руководству)
              </label>
              <textarea
                rows={2}
                value={truckDetails}
                onChange={(e) => setTruckDetails(e.target.value)}
                placeholder="Пример: КамАЗ 712 (3.1 т), МАН 890 (3.2 т)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Примечания ветеринарного контроля и качество полутуш
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Состояние туш, ветклеймо, температура хранения, инциденты смены..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Video Attachment Section */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Видеофиксация смены (Контроль забоя и погрузки)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Загрузите видеофайл или снимите на камеру
              </span>
            </div>

            {/* Hidden Input for Video */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />

            {!videoFile && !videoPreviewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-900/50 hover:bg-slate-900/80 group"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-950/60 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-200">
                  Нажмите, чтобы прикрепить видео смены
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  MP4, MOV, WEBM (до 250 МБ). Будет сохранено и отправлено на Google Диск для
                  просмотра начальником.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-xs">
                        {videoFile?.name || 'Видеозапись смены'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {videoFile
                          ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} МБ • Готово к отправке`
                          : 'Видео прикреплено'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
                    >
                      Заменить видео
                    </button>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 transition-colors"
                      title="Удалить видео"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Video Player Preview */}
                {videoPreviewUrl && (
                  <div className="mt-4 rounded-lg overflow-hidden bg-black max-h-60 flex justify-center">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="max-h-60 w-auto rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>
                Отчёт сразу появится в сводной таблице начальника и синхронизируется с Google
                Диском.
              </span>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-3 transition-all ${
                isUploading
                  ? 'bg-slate-700 cursor-wait'
                  : 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 active:scale-[0.99] shadow-amber-950/60'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{statusMessage || 'Сохранение смены...'}</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-5 h-5" />
                  <span>Сохранить смену в базу и отправить отчёт</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
