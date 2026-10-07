import React, { useState, useMemo } from 'react';
import {
  Truck,
  Beef,
  Scale,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Video,
  Play,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Share2,
  HardDrive,
  Trash2,
  ExternalLink,
  Filter,
  Eye,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { ShiftReport, SortField, SortOrder, ShiftFilterOptions } from '../types/shift';

interface BossReportDashboardProps {
  shifts: ShiftReport[];
  onVerifyShift: (shiftId: string) => Promise<void>;
  onDeleteShift: (shiftId: string, shiftName: string) => Promise<void>;
  onSyncShiftToDrive: (shift: ShiftReport) => Promise<void>;
  onOpenVideoModal: (shift: ShiftReport) => void;
  onOpenShareModal: () => void;
  driveFolderUrl: string | null;
  isDriveConnected: boolean;
  onSyncAllToDrive: () => Promise<void>;
  isSyncingAll: boolean;
}

export const BossReportDashboard: React.FC<BossReportDashboardProps> = ({
  shifts,
  onVerifyShift,
  onDeleteShift,
  onSyncShiftToDrive,
  onOpenVideoModal,
  onOpenShareModal,
  driveFolderUrl,
  isDriveConnected,
  onSyncAllToDrive,
  isSyncingAll,
}) => {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last7' | 'month'>('all');
  const [onlyWithVideo, setOnlyWithVideo] = useState(false);
  const [selectedBrigade, setSelectedBrigade] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Get unique brigades for filter dropdown
  const uniqueBrigades = useMemo(() => {
    const set = new Set<string>();
    shifts.forEach((s) => {
      if (s.brigade) set.add(s.brigade);
    });
    return Array.from(set);
  }, [shifts]);

  // Handle Sort Toggle
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNotes = (shift.notes || '').toLowerCase().includes(query);
        const matchTrucks = (shift.truckDetails || '').toLowerCase().includes(query);
        const matchBrigade = (shift.brigade || '').toLowerCase().includes(query);
        const matchSupervisor = (shift.supervisorName || '').toLowerCase().includes(query);
        const matchDate = shift.date.includes(query);
        if (!matchNotes && !matchTrucks && !matchBrigade && !matchSupervisor && !matchDate) {
          return false;
        }
      }

      // 2. Date Range
      if (dateFilter !== 'all') {
        const shiftDate = new Date(shift.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          const shiftD = new Date(shift.date);
          shiftD.setHours(0, 0, 0, 0);
          if (shiftD.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'last7') {
          const past7 = new Date();
          past7.setDate(past7.getDate() - 7);
          past7.setHours(0, 0, 0, 0);
          if (shiftDate < past7) return false;
        } else if (dateFilter === 'month') {
          const past30 = new Date();
          past30.setDate(past30.getDate() - 30);
          past30.setHours(0, 0, 0, 0);
          if (shiftDate < past30) return false;
        }
      }

      // 3. Brigade
      if (selectedBrigade !== 'all' && shift.brigade !== selectedBrigade) {
        return false;
      }

      // 5. Video filter
      if (onlyWithVideo && !shift.videoUrl && !shift.videoFileName && !shift.driveFileUrl) {
        return false;
      }

      return true;
    });
  }, [shifts, searchQuery, dateFilter, selectedBrigade, onlyWithVideo]);

  // Sort filtered shifts
  const sortedShifts = useMemo(() => {
    const list = [...filteredShifts];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'trucks':
          comparison = a.trucksLoaded - b.trucksLoaded;
          break;
        case 'bulls':
          comparison = a.bullsSlaughtered - b.bullsSlaughtered;
          break;
        case 'meatWeight':
          comparison = a.meatWeightKg - b.meatWeightKg;
          break;
        case 'avgPerBull':
          comparison = a.avgMeatPerBullKg - b.avgMeatPerBullKg;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredShifts, sortField, sortOrder]);

  // Overall KPI metrics from filtered list
  const metrics = useMemo(() => {
    const totalTrucks = sortedShifts.reduce((acc, s) => acc + s.trucksLoaded, 0);
    const totalBulls = sortedShifts.reduce((acc, s) => acc + s.bullsSlaughtered, 0);
    const totalMeatKg = sortedShifts.reduce((acc, s) => acc + s.meatWeightKg, 0);
    const totalMeatTons = Math.round((totalMeatKg / 1000) * 100) / 100;
    const avgPerBull =
      totalBulls > 0 ? Math.round((totalMeatKg / totalBulls) * 10) / 10 : 0;
    const videoCount = sortedShifts.filter((s) => s.videoUrl || s.videoFileName).length;
    const verifiedCount = sortedShifts.filter((s) => s.verifiedByBoss).length;

    return {
      totalTrucks,
      totalBulls,
      totalMeatKg,
      totalMeatTons,
      avgPerBull,
      videoCount,
      verifiedCount,
      totalShifts: sortedShifts.length,
    };
  }, [sortedShifts]);

  // Export to CSV function (with Russian UTF-8 BOM)
  const exportToCsv = () => {
    const headers = [
      'Дата',
      'Бригада',
      'Мастер',
      'Машин загружено (шт)',
      'Быков забито (гол)',
      'Мясо (кг)',
      'Мясо (тонн)',
      'Ср. вес на быка (кг)',
      'Машины / Накладные',
      'Видеозапись',
      'Статус проверки',
      'Примечания',
    ];

    const rows = sortedShifts.map((s) => [
      s.date,
      `"${(s.brigade || '').replace(/"/g, '""')}"`,
      `"${(s.supervisorName || '').replace(/"/g, '""')}"`,
      s.trucksLoaded,
      s.bullsSlaughtered,
      s.meatWeightKg,
      s.meatWeightTons,
      s.avgMeatPerBullKg,
      `"${(s.truckDetails || '').replace(/"/g, '""')}"`,
      s.videoFileName ? 'Да' : 'Нет',
      s.verifiedByBoss ? 'Утверждено' : 'Не утверждено',
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Отчет_по_сменам_забой_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Сводный отчёт для начальника
              </h1>
              <p className="text-xs text-slate-400">
                Контроль загрузки машин, забоя скота, выхода мяса и подтверждающих видеозаписей
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Share link, Drive Folder, Export, Print */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-950/50"
          >
            <Share2 className="w-4 h-4" />
            <span>Ссылка на отчёт</span>
          </button>

          {isDriveConnected && (
            <button
              onClick={onSyncAllToDrive}
              disabled={isSyncingAll}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-900/60 text-xs sm:text-sm font-medium transition-colors"
              title="Синхронизировать все смены и сводный CSV на Google Диск"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Синхронизация...' : 'В Google Диск'}</span>
            </button>
          )}

          {driveFolderUrl && (
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Папка на Диске</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          )}

          <button
            onClick={exportToCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            title="Экспорт в Excel / CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs sm:text-sm font-medium transition-colors"
            title="Печать официального отчёта"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Печать</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Trucks Loaded */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Загружено машин
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-4xl font-black text-white">
              {metrics.totalTrucks}
            </span>
            <span className="text-xs font-semibold text-sky-400">машин</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Отгружено рефрижераторов</p>
        </div>

        {/* KPI 2: Bulls Slaughtered */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Забито быков
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Beef className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-4xl font-black text-amber-400">
              {metrics.totalBulls}
            </span>
            <span className="text-xs font-semibold text-amber-300">голов</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Общий объём забоя</p>
        </div>

        {/* KPI 3: Meat Weight (Tons & Kg) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Выход мяса
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-4xl font-black text-emerald-400">
              {metrics.totalMeatTons}
            </span>
            <span className="text-xs font-semibold text-emerald-300">тонн</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.totalMeatKg.toLocaleString()} кг чистой продукции
          </p>
        </div>

        {/* KPI 4: Avg Meat per Bull */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ср. вес на быка
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-4xl font-black text-white">
              {metrics.avgPerBull}
            </span>
            <span className="text-xs font-semibold text-indigo-400">кг / туша</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Подтверждено: {metrics.verifiedCount} из {metrics.totalShifts} смен
          </p>
        </div>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        {/* Search bar & Quick Period Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по номеру машины, бригаде, мастеру, примечаниям..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                Очистить
              </button>
            )}
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'Все смены' },
              { id: 'today', label: 'Сегодня' },
              { id: 'last7', label: '7 дней' },
              { id: 'month', label: '30 дней' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateFilter(p.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  dateFilter === p.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher: Table vs Cards */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Таблица
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Карточки
            </button>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-850 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Brigade filter */}
            {uniqueBrigades.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Бригада:</span>
                <select
                  value={selectedBrigade}
                  onChange={(e) => setSelectedBrigade(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Все бригады</option>
                  {uniqueBrigades.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Checkbox */}
            <label className="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithVideo}
                onChange={(e) => setOnlyWithVideo(e.target.checked)}
                className="rounded border-slate-750 bg-slate-950 text-indigo-500 focus:ring-0"
              />
              <Video className="w-3.5 h-3.5 text-indigo-400" />
              <span>Только с видеозаписью ({metrics.videoCount})</span>
            </label>
          </div>

          {/* Quick Sort Dropdown for Mobile / Direct selection */}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-500">Сортировка:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleSort('date')}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${
                  sortField === 'date'
                    ? 'bg-amber-600/20 border-amber-600/50 text-amber-300'
                    : 'bg-slate-950 border-slate-850 text-slate-400'
                }`}
              >
                Дата {sortField === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => toggleSort('trucks')}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${
                  sortField === 'trucks'
                    ? 'bg-sky-600/20 border-sky-600/50 text-sky-300'
                    : 'bg-slate-950 border-slate-850 text-slate-400'
                }`}
              >
                Машины {sortField === 'trucks' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => toggleSort('bulls')}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${
                  sortField === 'bulls'
                    ? 'bg-amber-600/20 border-amber-600/50 text-amber-300'
                    : 'bg-slate-950 border-slate-850 text-slate-400'
                }`}
              >
                Быки {sortField === 'bulls' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => toggleSort('meatWeight')}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 ${
                  sortField === 'meatWeight'
                    ? 'bg-emerald-600/20 border-emerald-600/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-850 text-slate-400'
                }`}
              >
                Мясо {sortField === 'meatWeight' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table View or Cards View */}
      {sortedShifts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Beef className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-200">По выбранным фильтрам смен не найдено</p>
          <p className="text-xs text-slate-500 mt-1">
            Попробуйте сбросить параметры поиска или добавить новую смену
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setDateFilter('all');
              setSelectedBrigade('all');
              setOnlyWithVideo(false);
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th
                    onClick={() => toggleSort('date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Дата смены</span>
                      {sortField === 'date' &&
                        (sortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('trucks')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Truck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Машин</span>
                      {sortField === 'trucks' &&
                        (sortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('bulls')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Beef className="w-3.5 h-3.5 text-amber-500" />
                      <span>Быков</span>
                      {sortField === 'bulls' &&
                        (sortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('meatWeight')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Мясо (кг / т)</span>
                      {sortField === 'meatWeight' &&
                        (sortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                        ))}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('avgPerBull')}
                    className="py-3.5 px-4 cursor-pointer hover:text-white select-none text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Ср. вес</span>
                      {sortField === 'avgPerBull' &&
                        (sortOrder === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                        ))}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Бригада / Мастер</th>
                  <th className="py-3.5 px-4 text-center">Видео</th>
                  <th className="py-3.5 px-4 text-center">Google Диск</th>
                  <th className="py-3.5 px-4 text-center">Статус</th>
                  <th className="py-3.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {sortedShifts.map((shift) => {
                  const hasVideo = !!(shift.videoUrl || shift.videoFileName || shift.driveFileUrl);
                  const isExpanded = expandedShiftId === shift.id;

                  return (
                    <React.Fragment key={shift.id}>
                      <tr className="hover:bg-slate-850/60 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{shift.date}</div>
                        </td>

                        {/* Trucks Loaded */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-white text-base">
                            {shift.trucksLoaded}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1">маш.</span>
                        </td>

                        {/* Bulls Slaughtered */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-amber-400 text-base">
                            {shift.bullsSlaughtered}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1">гол.</span>
                        </td>

                        {/* Meat Weight */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-emerald-400">
                            {shift.meatWeightTons} т
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {shift.meatWeightKg.toLocaleString()} кг
                          </div>
                        </td>

                        {/* Avg meat per bull */}
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-semibold text-xs px-2 py-0.5 rounded ${
                              shift.avgMeatPerBullKg >= 310
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {shift.avgMeatPerBullKg} кг
                          </span>
                        </td>

                        {/* Brigade & Supervisor */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200 truncate max-w-[160px]">
                            {shift.brigade}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {shift.supervisorName}
                          </div>
                        </td>

                        {/* Video Inspection */}
                        <td className="py-3.5 px-4 text-center">
                          {hasVideo ? (
                            <button
                              onClick={() => onOpenVideoModal(shift)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all text-xs font-medium"
                              title="Смотреть видеозапись смены"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Видео</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Google Drive Status */}
                        <td className="py-3.5 px-4 text-center">
                          {shift.syncedToDrive ? (
                            <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                              <HardDrive className="w-3 h-3" />
                              <span>Синхронизировано</span>
                            </div>
                          ) : isDriveConnected ? (
                            <button
                              onClick={() => onSyncShiftToDrive(shift)}
                              className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                              <HardDrive className="w-3 h-3" />
                              <span>Загрузить на Диск</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">Локально</span>
                          )}
                        </td>

                        {/* Verification Status */}
                        <td className="py-3.5 px-4 text-center">
                          {shift.verifiedByBoss ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/40">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Утверждено</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => onVerifyShift(shift.id)}
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline font-medium"
                            >
                              Утвердить
                            </button>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setExpandedShiftId(isExpanded ? null : shift.id)
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Подробности"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                onDeleteShift(
                                  shift.id,
                                  `Смена за ${shift.date}`
                                )
                              }
                              className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              title="Удалить смену"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 text-slate-300">
                          <td colSpan={10} className="p-4 border-t border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="font-bold text-slate-200 block mb-1">
                                  🚛 Номера машин и накладные:
                                </span>
                                <p className="text-slate-400 whitespace-pre-wrap">
                                  {shift.truckDetails || 'Подробности по машинам не указаны'}
                                </p>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="font-bold text-slate-200 block mb-1">
                                  📝 Примечания ветеринара и замечания смены:
                                </span>
                                <p className="text-slate-400 whitespace-pre-wrap">
                                  {shift.notes || 'Без замечаний'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedShifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{shift.date}</h3>
                  <p className="text-xs text-slate-400">
                    {shift.brigade} • {shift.supervisorName}
                  </p>
                </div>
              </div>

              {/* Numbers Grid */}
              <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-950 rounded-xl border border-slate-850">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">МАШИН</p>
                  <p className="text-xl font-black text-white">{shift.trucksLoaded}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">БЫКОВ</p>
                  <p className="text-xl font-black text-amber-400">{shift.bullsSlaughtered}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">МЯСО</p>
                  <p className="text-xl font-black text-emerald-400">{shift.meatWeightTons} т</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ср. вес на быка:</span>
                <span className="font-bold text-white">{shift.avgMeatPerBullKg} кг</span>
              </div>

              {shift.truckDetails && (
                <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 truncate">
                  <span className="text-slate-500">Машины:</span> {shift.truckDetails}
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {(shift.videoUrl || shift.videoFileName) && (
                  <button
                    onClick={() => onOpenVideoModal(shift)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Смотреть видео</span>
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  {shift.verifiedByBoss ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Принято</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onVerifyShift(shift.id)}
                      className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white text-xs font-medium transition-colors"
                    >
                      Утвердить
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onDeleteShift(
                        shift.id,
                        `Смена за ${shift.date} (${shift.shiftType === 'day' ? 'День' : 'Ночь'})`
                      )
                    }
                    className="p-1.5 text-rose-500/70 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
