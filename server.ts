import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup directories for persistent data & media uploads
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SHIFTS_FILE = path.join(DATA_DIR, 'shifts.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Seed initial realistic slaughterhouse & dispatch shift data if file doesn't exist
if (!fs.existsSync(SHIFTS_FILE)) {
  const initialShifts = [
    {
      id: 'shift-101',
      date: '2026-10-06',
      shiftType: 'day',
      brigade: 'Бригада №1 (Ашраф А.)',
      supervisorName: 'Ашраф Аброров',
      trucksLoaded: 5,
      bullsSlaughtered: 46,
      meatWeightKg: 14720,
      meatWeightTons: 14.72,
      avgMeatPerBullKg: 320,
      truckDetails: 'КамАЗ 712 (3.1т), МАН 890 (3.2т), Вольво 430 (2.9т), КамАЗ 115 (2.8т), Газель 908 (2.72т)',
      notes: 'Забой скота прошёл без задержек. Ветврач провёл полное клеймение полутуш. Отгрузка охлаждённого мяса завершена в 19:30.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoFileName: 'inspection_shift_06_10_day.mp4',
      videoFileSize: 15420000,
      driveFileId: 'demo-drive-id-1',
      driveFileUrl: 'https://drive.google.com',
      driveFolderUrl: 'https://drive.google.com',
      syncedToDrive: true,
      verifiedByBoss: true,
      verifiedAt: '2026-10-06T20:15:00Z',
      createdAt: '2026-10-06T19:40:00Z',
      updatedAt: '2026-10-06T20:15:00Z',
    },
    {
      id: 'shift-102',
      date: '2026-10-05',
      shiftType: 'night',
      brigade: 'Бригада №2 (Бахром К.)',
      supervisorName: 'Бахром Каримов',
      trucksLoaded: 4,
      bullsSlaughtered: 38,
      meatWeightKg: 12160,
      meatWeightTons: 12.16,
      avgMeatPerBullKg: 320,
      truckDetails: 'Скания 504 (3.0т), КамАЗ 311 (3.1т), МАЗ 742 (3.06т), Ивеко 210 (3.0т)',
      notes: 'Ночная смена выполнила план обвалки и охлаждения. Температурный режим в холодильной камере -2°C соблюдён.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      videoFileName: 'shift_night_05_10_cctv.mp4',
      videoFileSize: 12300000,
      driveFileId: 'demo-drive-id-2',
      driveFileUrl: 'https://drive.google.com',
      driveFolderUrl: 'https://drive.google.com',
      syncedToDrive: true,
      verifiedByBoss: true,
      verifiedAt: '2026-10-06T09:00:00Z',
      createdAt: '2026-10-06T07:30:00Z',
      updatedAt: '2026-10-06T09:00:00Z',
    },
    {
      id: 'shift-103',
      date: '2026-10-05',
      shiftType: 'day',
      brigade: 'Бригада №1 (Ашраф А.)',
      supervisorName: 'Ашраф Аброров',
      trucksLoaded: 6,
      bullsSlaughtered: 52,
      meatWeightKg: 16900,
      meatWeightTons: 16.9,
      avgMeatPerBullKg: 325,
      truckDetails: '6 фур рефрижераторов отгружено в сеть супермаркетов и оптовые базы.',
      notes: 'Высокая упитанность партии быков казахской белоголовой породы. Средний чистый вес туши 325 кг.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      videoFileName: 'loading_dock_inspection_05_10.mp4',
      videoFileSize: 18100000,
      driveFileId: null,
      driveFileUrl: null,
      driveFolderUrl: null,
      syncedToDrive: false,
      verifiedByBoss: false,
      verifiedAt: null,
      createdAt: '2026-10-05T19:50:00Z',
      updatedAt: '2026-10-05T19:50:00Z',
    },
    {
      id: 'shift-104',
      date: '2026-10-04',
      shiftType: 'day',
      brigade: 'Бригада №1 (Ашраф А.)',
      supervisorName: 'Ашраф Аброров',
      trucksLoaded: 4,
      bullsSlaughtered: 40,
      meatWeightKg: 12600,
      meatWeightTons: 12.6,
      avgMeatPerBullKg: 315,
      truckDetails: 'КамАЗ 881, КамАЗ 772, МАЗ 192, Газель 551',
      notes: 'Все накладные подписаны ветеринаром цеха. Качество полутуш высшей категории.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      videoFileName: 'shift_video_04_10.mp4',
      videoFileSize: 14200000,
      driveFileId: 'demo-drive-id-4',
      driveFileUrl: 'https://drive.google.com',
      driveFolderUrl: 'https://drive.google.com',
      syncedToDrive: true,
      verifiedByBoss: true,
      verifiedAt: '2026-10-04T21:00:00Z',
      createdAt: '2026-10-04T19:30:00Z',
      updatedAt: '2026-10-04T21:00:00Z',
    }
  ];
  fs.writeFileSync(SHIFTS_FILE, JSON.stringify(initialShifts, null, 2), 'utf-8');
}

// Multer storage for uploaded video files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${cleanName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit for shift videos
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static route for media uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Helpers to read/write shifts JSON database
const getShiftsData = () => {
  try {
    if (fs.existsSync(SHIFTS_FILE)) {
      const content = fs.readFileSync(SHIFTS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading shifts file:', err);
  }
  return [];
};

const saveShiftsData = (shifts: any[]) => {
  try {
    fs.writeFileSync(SHIFTS_FILE, JSON.stringify(shifts, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing shifts file:', err);
    return false;
  }
};

// API: Get all shifts
app.get('/api/shifts', (_req, res) => {
  const shifts = getShiftsData();
  // Return sorted by date/creation descending by default
  shifts.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  res.json({ success: true, shifts });
});

// API: Get single shift by ID (for direct shareable link)
app.get('/api/shifts/:id', (req, res) => {
  const shifts = getShiftsData();
  const shift = shifts.find((s: any) => s.id === req.params.id);
  if (!shift) {
    return res.status(404).json({ success: false, error: 'Смена не найдена' });
  }
  res.json({ success: true, shift });
});

// API: Create new shift
app.post('/api/shifts', (req, res) => {
  try {
    const shifts = getShiftsData();
    const newShift = {
      id: req.body.id || `shift-${Date.now()}`,
      date: req.body.date || new Date().toISOString().split('T')[0],
      shiftType: req.body.shiftType || '',
      brigade: req.body.brigade || 'Бригада №1',
      supervisorName: req.body.supervisorName || 'Мастер смены',
      trucksLoaded: Number(req.body.trucksLoaded) || 0,
      bullsSlaughtered: Number(req.body.bullsSlaughtered) || 0,
      meatWeightKg: Number(req.body.meatWeightKg) || 0,
      meatWeightTons: Number(req.body.meatWeightTons) || ((Number(req.body.meatWeightKg) || 0) / 1000),
      avgMeatPerBullKg: Number(req.body.bullsSlaughtered) > 0
        ? Math.round((Number(req.body.meatWeightKg) / Number(req.body.bullsSlaughtered)) * 10) / 10
        : 0,
      truckDetails: req.body.truckDetails || '',
      notes: req.body.notes || '',
      videoUrl: req.body.videoUrl || '',
      videoFileName: req.body.videoFileName || '',
      videoFileSize: req.body.videoFileSize || 0,
      driveFileId: req.body.driveFileId || null,
      driveFileUrl: req.body.driveFileUrl || null,
      driveFolderUrl: req.body.driveFolderUrl || null,
      syncedToDrive: Boolean(req.body.syncedToDrive),
      verifiedByBoss: false,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    shifts.unshift(newShift);
    saveShiftsData(shifts);

    res.json({ success: true, shift: newShift });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Update shift (e.g., mark verified or update drive sync status)
app.put('/api/shifts/:id', (req, res) => {
  try {
    const shifts = getShiftsData();
    const index = shifts.findIndex((s: any) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Смена не найдена' });
    }

    const current = shifts[index];
    const updated = {
      ...current,
      ...req.body,
      id: current.id, // prevent ID change
      updatedAt: new Date().toISOString(),
    };

    // Auto-recalculate weights if updated
    if (req.body.meatWeightKg !== undefined || req.body.bullsSlaughtered !== undefined) {
      const kg = Number(updated.meatWeightKg) || 0;
      const bulls = Number(updated.bullsSlaughtered) || 0;
      updated.meatWeightTons = Math.round((kg / 1000) * 100) / 100;
      updated.avgMeatPerBullKg = bulls > 0 ? Math.round((kg / bulls) * 10) / 10 : 0;
    }

    shifts[index] = updated;
    saveShiftsData(shifts);

    res.json({ success: true, shift: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete shift
app.delete('/api/shifts/:id', (req, res) => {
  try {
    const shifts = getShiftsData();
    const filtered = shifts.filter((s: any) => s.id !== req.params.id);
    if (filtered.length === shifts.length) {
      return res.status(404).json({ success: false, error: 'Смена не найдена' });
    }
    saveShiftsData(filtered);
    res.json({ success: true, message: 'Смена успешно удалена' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Upload video file
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл видео не передан' });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      videoUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express server and mount Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static dist
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
