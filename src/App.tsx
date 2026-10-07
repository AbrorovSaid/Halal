import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { ShiftEntryForm } from './components/ShiftEntryForm';
import { BossReportDashboard } from './components/BossReportDashboard';
import { VideoModal } from './components/VideoModal';
import { ShareModal } from './components/ShareModal';
import { ShiftReport } from './types/shift';
import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  getOrCreateDriveFolder,
  uploadFileToGoogleDrive,
  saveShiftReportJsonToDrive,
  syncSummaryCsvToDrive,
  deleteDriveFileWithConfirmation,
} from './services/googleDrive';
import {
  getLocalShifts,
  saveLocalShift,
  updateLocalShift,
  deleteLocalShift,
  getLocalVideoUrl,
} from './services/storage';

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'entry' | 'boss'>('entry');
  const [shifts, setShifts] = useState<ShiftReport[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState<boolean>(true);

  // Google Drive & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Modal States
  const [selectedVideoShift, setSelectedVideoShift] = useState<ShiftReport | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareSpecificShift, setShareSpecificShift] = useState<ShiftReport | null>(null);

  // Toast / Status notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Check URL parameters for boss link (?view=boss)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'boss') {
      setActiveTab('boss');
    }

    // Clean out any legacy mock data from browser storage
    try {
      const ctrl = localStorage.getItem('pinsk_controller_name');
      if (ctrl === 'Ашраф Аброров' || ctrl === 'Бахром Каримов') {
        localStorage.removeItem('pinsk_controller_name');
      }
      localStorage.removeItem('pinsk_controllers_list');

      const backup = localStorage.getItem('pinsk_meat_shifts_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        const filtered = parsed.filter(
          (s: any) => !s.id.startsWith('shift-10') && s.supervisorName !== 'Ашраф Аброров'
        );
        localStorage.setItem('pinsk_meat_shifts_backup', JSON.stringify(filtered));
      }
    } catch {}
  }, []);

  // 2. Fetch shifts from reliable local storage
  const loadShifts = useCallback(async () => {
    try {
      setIsLoadingShifts(true);
      const list = await getLocalShifts();
      setShifts(list);

      // Check if specific shift requested in URL
      const params = new URLSearchParams(window.location.search);
      const shiftId = params.get('shiftId');
      if (shiftId) {
        const found = list.find((s) => s.id === shiftId);
        if (found && (found.videoUrl || found.driveFileUrl)) {
          setSelectedVideoShift(found);
        }
      }
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setIsLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // 3. Initialize Firebase Auth for Google Drive integration
  useEffect(() => {
    initAuth(
      async (authUser, _token) => {
        setUser(authUser);
        try {
          const folder = await getOrCreateDriveFolder();
          setDriveFolderId(folder.id);
          if (folder.webViewLink) {
            setDriveFolderUrl(folder.webViewLink);
          }
        } catch (e) {
          console.error('Error fetching drive folder:', e);
        }
      },
      () => {
        setUser(null);
        setDriveFolderId(null);
        setDriveFolderUrl(null);
      }
    );
  }, []);

  // Login handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        showToast('Google Диск успешно подключен!', 'success');
        const folder = await getOrCreateDriveFolder(result.accessToken);
        setDriveFolderId(folder.id);
        if (folder.webViewLink) setDriveFolderUrl(folder.webViewLink);
      }
    } catch (err: any) {
      showToast('Ошибка подключения Google: ' + (err.message || 'Сбой входа'), 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleGoogleLogout = async () => {
    await authLogout();
    setUser(null);
    setDriveFolderId(null);
    setDriveFolderUrl(null);
    showToast('Вы вышли из Google аккаунта', 'info');
  };

  // 4. Save shift workflow (Local Storage + Google Drive Sync)
  const handleSaveShift = async (
    shiftData: Omit<ShiftReport, 'id' | 'createdAt' | 'updatedAt' | 'verifiedByBoss' | 'verifiedAt'>,
    videoFile: File | null
  ): Promise<{ success: boolean; shift?: ShiftReport; error?: string }> => {
    try {
      const shiftId = `shift-${Date.now()}`;
      let videoUrl = '';
      let driveFileId: string | null = null;
      let driveFileUrl: string | null = null;
      let isSynced = false;

      // If video file provided, create playback URL
      if (videoFile) {
        videoUrl = URL.createObjectURL(videoFile);
      }

      // If Google Drive connected, upload directly to Google Drive
      const accessToken = await getAccessToken();
      if (accessToken) {
        try {
          let folderId = driveFolderId;
          if (!folderId) {
            const folder = await getOrCreateDriveFolder(accessToken);
            folderId = folder.id;
            setDriveFolderId(folder.id);
            if (folder.webViewLink) setDriveFolderUrl(folder.webViewLink);
          }

          if (videoFile && folderId) {
            const driveVideo = await uploadFileToGoogleDrive(
              videoFile,
              `Видео_смена_${shiftData.date}_${videoFile.name}`,
              videoFile.type || 'video/mp4',
              folderId
            );
            driveFileId = driveVideo.id;
            driveFileUrl = driveVideo.webViewLink || null;
          }

          isSynced = true;
        } catch (driveErr) {
          console.warn('Google Drive direct upload notice:', driveErr);
        }
      }

      const newShift: ShiftReport = {
        ...shiftData,
        id: shiftId,
        videoUrl: videoUrl || undefined,
        driveFileId,
        driveFileUrl,
        driveFolderUrl,
        syncedToDrive: isSynced,
        verifiedByBoss: false,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save locally (IndexedDB + localStorage backup)
      await saveLocalShift(newShift, videoFile);

      // Save to Google Drive if connected
      if (accessToken && driveFolderId) {
        try {
          await saveShiftReportJsonToDrive(newShift, driveFolderId);
          await syncSummaryCsvToDrive([newShift, ...shifts], driveFolderId);
        } catch (e) {
          console.warn('Drive summary sync notice:', e);
        }
      }

      await loadShifts();
      showToast('Смена успешно зафиксирована и сохранена!', 'success');
      return { success: true, shift: newShift };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка сохранения' };
    }
  };

  // 5. Verify Shift by boss
  const handleVerifyShift = async (shiftId: string) => {
    try {
      await updateLocalShift(shiftId, {
        verifiedByBoss: true,
        verifiedAt: new Date().toISOString(),
      });
      showToast('Смена утверждена руководителем!', 'success');
      await loadShifts();
    } catch (err) {
      showToast('Ошибка при утверждении смены', 'error');
    }
  };

  // 6. Delete shift with user confirmation dialog
  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    const confirmed = window.confirm(
      `Вы действительно хотите удалить запись: "${shiftName}"? Это действие нельзя будет отменить.`
    );
    if (!confirmed) return;

    try {
      const target = shifts.find((s) => s.id === shiftId);
      if (target?.driveFileId && user) {
        try {
          await deleteDriveFileWithConfirmation(
            target.driveFileId,
            target.videoFileName || 'видеозапись смены'
          );
        } catch (e) {
          console.warn('Could not delete from Drive:', e);
        }
      }

      await deleteLocalShift(shiftId);
      showToast('Смена успешно удалена', 'info');
      await loadShifts();
    } catch (err) {
      showToast('Ошибка при удалении смены', 'error');
    }
  };

  // 7. Sync single shift to Google Drive
  const handleSyncShiftToDrive = async (shift: ShiftReport) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      showToast('Сначала подключите Google Диск в правом верхнем углу', 'info');
      return;
    }

    try {
      showToast('Синхронизация смены с Google Диском...', 'info');
      let folderId = driveFolderId;
      if (!folderId) {
        const folder = await getOrCreateDriveFolder(accessToken);
        folderId = folder.id;
        setDriveFolderId(folder.id);
        if (folder.webViewLink) setDriveFolderUrl(folder.webViewLink);
      }

      await saveShiftReportJsonToDrive(shift, folderId);
      await syncSummaryCsvToDrive(shifts, folderId);

      await updateLocalShift(shift.id, {
        syncedToDrive: true,
        driveFolderUrl,
      });

      await loadShifts();
      showToast('Смена синхронизирована с Google Диском!', 'success');
    } catch (err: any) {
      showToast('Ошибка синхронизации: ' + err.message, 'error');
    }
  };

  // 8. Bulk Sync All shifts to Google Drive
  const handleSyncAllToDrive = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      showToast('Сначала подключите Google Диск', 'info');
      return;
    }

    setIsSyncingAll(true);
    try {
      let folderId = driveFolderId;
      if (!folderId) {
        const folder = await getOrCreateDriveFolder(accessToken);
        folderId = folder.id;
        setDriveFolderId(folder.id);
        if (folder.webViewLink) setDriveFolderUrl(folder.webViewLink);
      }

      await syncSummaryCsvToDrive(shifts, folderId);

      for (const shift of shifts) {
        if (!shift.syncedToDrive) {
          await saveShiftReportJsonToDrive(shift, folderId);
          await updateLocalShift(shift.id, { syncedToDrive: true });
        }
      }

      await loadShifts();
      showToast('Все смены и сводный CSV реестр обновлены на Google Диске!', 'success');
    } catch (err: any) {
      showToast('Ошибка при синхронизации: ' + err.message, 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Handler to open video modal (loads IndexedDB video blob if available)
  const handleOpenVideoModal = async (shift: ShiftReport) => {
    let playShift = { ...shift };
    if (!playShift.videoUrl) {
      const blobUrl = await getLocalVideoUrl(shift.id);
      if (blobUrl) {
        playShift.videoUrl = blobUrl;
      }
    }
    setSelectedVideoShift(playShift);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium border flex items-center gap-2 transition-all animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950 border-rose-600 text-rose-200'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isLoggingIn={isLoggingIn}
        driveFolderUrl={driveFolderUrl}
        onOpenShareModal={() => {
          setShareSpecificShift(null);
          setIsShareModalOpen(true);
        }}
        shiftsCount={shifts.length}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {activeTab === 'entry' ? (
          <ShiftEntryForm
            onSaveShift={handleSaveShift}
            isDriveConnected={!!user}
            onOpenShareModal={(shift) => {
              setShareSpecificShift(shift || null);
              setIsShareModalOpen(true);
            }}
          />
        ) : (
          <BossReportDashboard
            shifts={shifts}
            onVerifyShift={handleVerifyShift}
            onDeleteShift={handleDeleteShift}
            onSyncShiftToDrive={handleSyncShiftToDrive}
            onOpenVideoModal={handleOpenVideoModal}
            onOpenShareModal={() => {
              setShareSpecificShift(null);
              setIsShareModalOpen(true);
            }}
            driveFolderUrl={driveFolderUrl}
            isDriveConnected={!!user}
            onSyncAllToDrive={handleSyncAllToDrive}
            isSyncingAll={isSyncingAll}
          />
        )}
      </main>

      {/* Video Modal Player */}
      <VideoModal
        shift={selectedVideoShift}
        onClose={() => setSelectedVideoShift(null)}
      />

      {/* Share with Boss Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareSpecificShift(null);
        }}
        selectedShift={shareSpecificShift}
        totalShiftsCount={shifts.length}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>ОАО «Пинский мясокомбинат» • Автоматизированная система учёта забоя, тоннажа и отгрузок</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Синхронизация с Google Диском • Доступ по прямой ссылке для руководства
        </p>
      </footer>
    </div>
  );
}
