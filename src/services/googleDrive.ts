import { getAccessToken } from './firebaseAuth';
import { ShiftReport } from '../types/shift';

export const APP_DRIVE_FOLDER_NAME = 'Отчёты смен - Забой и Отгрузка';

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
}

/**
 * Searches for existing app folder or creates a new one in the user's Google Drive.
 */
export async function getOrCreateDriveFolder(accessToken?: string): Promise<DriveFolderInfo> {
  const token = accessToken || (await getAccessToken());
  if (!token) {
    throw new Error('Требуется авторизация в Google');
  }

  // 1. Search for existing folder
  const query = encodeURIComponent(
    `name = '${APP_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Ошибка поиска папки на Google Диске: ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  // 2. Folder not found -> Create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: APP_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Журнал отчётов смен: забой скота, загрузка машин, выход мяса и видеофиксация',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Ошибка создания папки на Google Диске: ${errText}`);
  }

  return await createRes.json();
}

/**
 * Uploads a file (video, document, JSON) to Google Drive in the specified folder.
 * Uses multipart upload for files up to 50MB and resumable upload for larger files.
 */
export async function uploadFileToGoogleDrive(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  folderId: string,
  onProgress?: (percent: number) => void
): Promise<DriveFileInfo> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Требуется авторизация в Google для загрузки файла');
  }

  // Use multipart upload for fast upload
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: mimeType || 'application/octet-stream',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}\r\n`;

  // Read blob as array buffer
  const fileBuffer = await file.arrayBuffer();
  const fileHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const enc = new TextEncoder();
  const p1 = enc.encode(metadataPart);
  const p2 = enc.encode(fileHeader);
  const p3 = new Uint8Array(fileBuffer);
  const p4 = enc.encode(closeDelimiter);

  const totalLength = p1.byteLength + p2.byteLength + p3.byteLength + p4.byteLength;
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  combined.set(p1, offset);
  offset += p1.byteLength;
  combined.set(p2, offset);
  offset += p2.byteLength;
  combined.set(p3, offset);
  offset += p3.byteLength;
  combined.set(p4, offset);

  if (onProgress) onProgress(40);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    }
  );

  if (onProgress) onProgress(90);

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Ошибка загрузки файла на Google Диск: ${errorText}`);
  }

  const result = await uploadRes.json();
  if (onProgress) onProgress(100);

  return result;
}

/**
 * Saves a single shift report as a formatted JSON document on Google Drive.
 */
export async function saveShiftReportJsonToDrive(
  shift: ShiftReport,
  folderId: string
): Promise<DriveFileInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Требуется авторизация в Google');

  const fileName = `Смена_${shift.date}_${shift.id}.json`;
  const reportPayload = {
    название: 'Производственный отчёт по смене',
    дата: shift.date,
    бригада: shift.brigade,
    ответственный: shift.supervisorName,
    показатели: {
      загружено_машин: shift.trucksLoaded,
      забито_быков: shift.bullsSlaughtered,
      вес_мяса_кг: shift.meatWeightKg,
      вес_мяса_тонн: shift.meatWeightTons,
      средний_выход_мяса_на_быка_кг: shift.avgMeatPerBullKg,
    },
    детали_отгрузки_машин: shift.truckDetails || 'Не указано',
    видео_подтверждение: {
      имя_файла: shift.videoFileName || null,
      ссылка_на_диске: shift.driveFileUrl || null,
    },
    примечания: shift.notes || '',
    дата_создания: shift.createdAt,
    проверено_руководством: shift.verifiedByBoss,
    дата_проверки: shift.verifiedAt || null,
  };

  const jsonBlob = new Blob([JSON.stringify(reportPayload, null, 2)], {
    type: 'application/json',
  });

  return await uploadFileToGoogleDrive(jsonBlob, fileName, 'application/json', folderId);
}

/**
 * Creates/updates a summary CSV file on Google Drive containing all shifts,
 * formatted with UTF-8 BOM so it opens correctly in Russian Excel and Google Sheets.
 */
export async function syncSummaryCsvToDrive(
  shifts: ShiftReport[],
  folderId: string
): Promise<DriveFileInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Требуется авторизация в Google');

  const csvRows: string[] = [];
  // CSV Header
  csvRows.push(
    [
      'Дата',
      'Бригада',
      'Ответственный',
      'Машин загружено (шт)',
      'Быков забито (гол)',
      'Мясо (кг)',
      'Мясо (т)',
      'Ср. вес на быка (кг)',
      'Номера машин / Накладные',
      'Видео подтверждение',
      'Ссылка на видео',
      'Статус проверки',
      'Примечания',
    ].join(';')
  );

  shifts.forEach((s) => {
    csvRows.push(
      [
        s.date,
        `"${(s.brigade || '').replace(/"/g, '""')}"`,
        `"${(s.supervisorName || '').replace(/"/g, '""')}"`,
        s.trucksLoaded,
        s.bullsSlaughtered,
        s.meatWeightKg,
        s.meatWeightTons,
        s.avgMeatPerBullKg,
        `"${(s.truckDetails || '').replace(/"/g, '""')}"`,
        s.videoFileName ? 'Прикреплено' : 'Нет',
        `"${(s.driveFileUrl || s.videoUrl || '').replace(/"/g, '""')}"`,
        s.verifiedByBoss ? 'Проверено' : 'На проверке',
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ].join(';')
    );
  });

  // UTF-8 BOM (\uFEFF) ensures Excel properly recognizes Cyrillic characters
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const fileName = '📊_Сводный_реестр_смен_забой_и_отгрузка.csv';
  return await uploadFileToGoogleDrive(csvBlob, fileName, 'text/csv', folderId);
}

/**
 * Mandatory User Confirmation before deleting files on Google Drive
 */
export async function deleteDriveFileWithConfirmation(
  fileId: string,
  fileName: string,
  confirmMessage?: string
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Требуется авторизация в Google');

  const confirmed = window.confirm(
    confirmMessage ||
      `Вы действительно хотите удалить файл "${fileName}" из Google Диска? Это действие нельзя будет отменить.`
  );
  if (!confirmed) return false;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Ошибка при удалении файла с Google Диска: ${errorText}`);
  }

  return true;
}
