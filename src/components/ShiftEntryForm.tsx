import React, { useState, useRef, useEffect } from 'react';
import {
  Truck,
  Beef,
  Scale,
  Video,
  Upload,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  HardDrive,
  Share2,
  Trash2,
  Play,
  UserCheck,
  User,
  X
} from 'lucide-react';
import { ShiftReport } from '../types/shift';

const CONTROLLER_STORAGE_KEY = 'pinsk_controller_name';
const CONTROLLER_HISTORY_KEY = 'pinsk_controllers_list';

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
  // Form State - Clean blank slate
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [brigade, setBrigade] = useState<string>('');
  
  // Controller profile persistence - starts completely clean
  const [supervisorName, setSupervisorName] = useState<string>(() => {
    const saved = localStorage.getItem(CONTROLLER_STORAGE_KEY) || '';
    if (saved === 'Ашраф Аброров' || saved === 'Бахром Каримов') {
      localStorage.removeItem(CONTROLLER_STORAGE_KEY);
      return '';
    }
    return saved;
  });
  const [savedControllers, setSavedControllers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(CONTROLLER_HISTORY_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const filtered = parsed.filter(
          (n) => n !== 'Ашраф Аброров' && n !== 'Бахром Каримов'
        );
        return filtered;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [showControllerModal, setShowControllerModal] = useState<boolean>(false);
  const [newControllerInput, setNewControllerInput] = useState<string>('');

  // Handle Controller Registration / Selection
  const handleSelectController = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setSupervisorName(clean);
    localStorage.setItem(CONTROLLER_STORAGE_KEY, clean);

    setSavedControllers((prev) => {
      const list = prev.includes(clean) ? prev : [clean, ...prev];
      localStorage.setItem(CONTROLLER_HISTORY_KEY, JSON.stringify(list));
      return list;
    });
    setShowControllerModal(false);
    setNewControllerInput('');
  };

  const handleControllerInputChange = (val: string) => {
    setSupervisorName(val);
    if (val.trim()) {
      localStorage.setItem(CONTROLLER_STORAGE_KEY, val.trim());
    } else {
      localStorage.removeItem(CONTROLLER_STORAGE_KEY);
    }
  };
  const [trucksLoaded, setTrucksLoaded] = useState<number>(0);
  const [bullsSlaughtered, setBullsSlaughtered] = useState<number>(0);
  const [meatWeightKg, setMeatWeightKg] = useState<number>(0);
  const [truckDetails, setTruckDetails] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

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
          {/* Shift Metadata Row: Date, Supervisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Controller / Supervisor Name with Auto-Memory */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Контролёр</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowControllerModal(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold hover:underline flex items-center gap-1"
                >
                  <User className="w-3 h-3" />
                  <span>Сменить профиль</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => handleControllerInputChange(e.target.value)}
                  placeholder="ФИО контролёра"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none pr-24 shadow-inner"
                />
                <span className="absolute right-2.5 top-2 text-[10px] bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Авто
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <span>✓ Запомнено для ваших смен. Имя подставляется автоматически.</span>
              </p>
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

          {/* Details: Trucks & Waybills */}
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
      {/* Controller Registration / Switcher Modal */}
      {showControllerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-white">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Авторизация контролёра</h3>
                  <p className="text-[11px] text-slate-400">
                    Имя сохраняется на устройстве и подставляется во все смены
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowControllerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Зарегистрировать новое ФИО:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newControllerInput}
                    onChange={(e) => setNewControllerInput(e.target.value)}
                    placeholder="Например: Иванов Иван И."
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectController(newControllerInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectController(newControllerInput)}
                    disabled={!newControllerInput.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors"
                  >
                    Запомнить
                  </button>
                </div>
              </div>

              {savedControllers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    Или выберите сохранённого контролёра:
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {savedControllers.map((ctrl) => (
                      <button
                        key={ctrl}
                        type="button"
                        onClick={() => handleSelectController(ctrl)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors text-left ${
                          supervisorName === ctrl
                            ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ctrl}</span>
                        </span>
                        {supervisorName === ctrl && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                            Активен
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowControllerModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
