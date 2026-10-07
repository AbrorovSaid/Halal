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
  }, []);

  // 2. Fetch shifts from backend database
  const loadShifts = useCallback(async () => {
    try {
      setIsLoadingShifts(true);
      const res = await fetch('/api/shifts');
      if (res.ok) {
        const data = await res.json();
        if (data.shifts) {
          setShifts(data.shifts);

          // If a specific shift was requested in URL query, highlight/open it
          const params = new URLSearchParams(window.location.search);
          const shiftId = params.get('shiftId');
          if (shiftId) {
            const found = data.shifts.find((s: ShiftReport) => s.id === shiftId);
            if (found && (found.videoUrl || found.driveFileUrl)) {
              setSelectedVideoShift(found);
            }
          }
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
        // Fetch or create Drive folder
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

  // 4. Save shift workflow (Local DB + Optional Upload + Google Drive Sync)
  const handleSaveShift = async (
    shiftData: Omit<ShiftReport, 'id' | 'createdAt' | 'updatedAt' | 'verifiedByBoss' | 'verifiedAt'>,
    videoFile: File | null
  ): Promise<{ success: boolean; shift?: ShiftReport; error?: string }> => {
    try {
      let serverVideoUrl = '';
      let driveFileId: string | null = null;
      let driveFileUrl: string | null = null;
      let isSynced = false;

      // A. Upload video to local server storage if present
      if (videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);
        const uploadRes = await fetch('/api/upload-video', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          serverVideoUrl = uploadJson.videoUrl;
        }
      }

      // B. If Google Drive is authenticated, upload video and records to Drive!
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

          // Upload video to Google Drive
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
          console.warn('Could not sync video to Drive directly:', driveErr);
        }
      }

      // C. Save shift to backend API
      const newShiftPayload = {
        ...shiftData,
        videoUrl: serverVideoUrl,
        driveFileId,
        driveFileUrl,
        driveFolderUrl,
        syncedToDrive: isSynced,
      };

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShiftPayload),
      });

      if (!res.ok) {
        throw new Error('Ошибка сервера при создании смены');
      }

      const resJson = await res.json();
      const createdShift: ShiftReport = resJson.shift;

      // D. If synced to Drive, also save the JSON card and update summary CSV!
      if (accessToken && driveFolderId) {
        try {
          await saveShiftReportJsonToDrive(createdShift, driveFolderId);
          await syncSummaryCsvToDrive([createdShift, ...shifts], driveFolderId);
        } catch (e) {
          console.warn('Drive summary sync error:', e);
        }
      }

      // Reload shifts list
      await loadShifts();
      showToast('Смена успешно зафиксирована и сохранена!', 'success');

      return { success: true, shift: createdShift };
    } catch (err: any) {
      return { success: false, error: err.message || 'Ошибка сохранения' };
    }
  };

  // 5. Verify Shift by boss
  const handleVerifyShift = async (shiftId: string) => {
    try {
      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedByBoss: true,
          verifiedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        showToast('Смена утверждена руководителем!', 'success');
        await loadShifts();
      }
    } catch (err) {
      showToast('Ошибка при утверждении смены', 'error');
    }
  };

  // 6. Delete shift with user confirmation dialog (MANDATORY per guidelines)
  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    const confirmed = window.confirm(
      `Вы действительно хотите удалить запись: "${shiftName}"? Это действие нельзя будет отменить.`
    );
    if (!confirmed) return;

    try {
      const target = shifts.find((s) => s.id === shiftId);
      // If there was a Google Drive file, ask to remove from Drive as well
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

      const res = await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Смена успешно удалена', 'info');
        await loadShifts();
      }
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

      // Update backend record
      await fetch(`/api/shifts/${shift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncedToDrive: true,
          driveFolderUrl,
        }),
      });

      await loadShifts();
      showToast('Смена синхронизирована с Google Диском!', 'success');
    } catch (err: any) {
      showToast('Ошибка синхронизации: ' + err.message, 'error');
    }
  };

  // 8. Bulk Sync All shifts & Summary CSV to Google Drive
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

      // Sync summary CSV file
      await syncSummaryCsvToDrive(shifts, folderId);

      // Mark shifts synced
      for (const shift of shifts) {
        if (!shift.syncedToDrive) {
          await saveShiftReportJsonToDrive(shift, folderId);
          await fetch(`/api/shifts/${shift.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ syncedToDrive: true }),
          });
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
            onOpenVideoModal={(shift) => setSelectedVideoShift(shift)}
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
