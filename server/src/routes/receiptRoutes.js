import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { uploadQueries, userQueries } from '../db/index.js';
import { extractReceiptData } from '../services/geminiService.js';
import { getOrCreateReceiptsFolder, uploadReceiptImage } from '../services/driveService.js';
import { getOrCreateReceiptTrackerSheet, appendReceiptRow } from '../services/sheetsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp uploads folder exists
const tempUploadsDir = path.resolve(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
}

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are supported'));
    }
  },
});

const router = express.Router();

// 1. Analyze receipt photo with Gemini 3.5 Flash
router.post('/analyze', requireAuth, upload.single('receipt'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No receipt file uploaded' });
  }

  const fileId = uuidv4();
  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const originalName = req.file.originalname;

  try {
    uploadQueries.createTempUpload({
      id: fileId,
      user_id: req.user.id,
      file_path: filePath,
      original_name: originalName,
      mime_type: mimeType,
    });

    const extractedData = await extractReceiptData(filePath, mimeType);

    res.json({
      success: true,
      tempImageId: fileId,
      previewUrl: `/api/receipts/temp-image/${fileId}`,
      data: extractedData,
    });
  } catch (err) {
    console.error('Receipt analysis error:', err);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      uploadQueries.deleteTempUpload(fileId);
    } catch (_) {}

    res.status(500).json({
      error: err.message || 'Failed to analyze receipt. Please check your Gemini API key.',
    });
  }
});

// 2. Serve temp image for preview
router.get('/temp-image/:id', requireAuth, (req, res) => {
  const temp = uploadQueries.getTempUpload(req.params.id);
  if (!temp || temp.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Image not found' });
  }

  if (!fs.existsSync(temp.file_path)) {
    return res.status(404).json({ error: 'Image file has expired or was removed' });
  }

  res.setHeader('Content-Type', temp.mime_type);
  fs.createReadStream(temp.file_path).pipe(res);
});

// 3. Submit verified receipt to user's personal Google Drive & Google Sheet
router.post('/submit', requireAuth, async (req, res) => {
  const { tempImageId, verifiedData } = req.body;
  if (!tempImageId || !verifiedData) {
    return res.status(400).json({ error: 'Missing tempImageId or verifiedData' });
  }

  const temp = uploadQueries.getTempUpload(tempImageId);
  if (!temp || temp.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Temporary upload not found or already submitted' });
  }

  if (!fs.existsSync(temp.file_path)) {
    uploadQueries.deleteTempUpload(tempImageId);
    return res.status(404).json({ error: 'Temporary image file not found on server' });
  }

  try {
    if (!req.googleAuthClient) {
      throw new Error('Google authorization client is not available. Please re-authenticate.');
    }

    let folderId = req.user.target_folder_id;
    let sheetId = req.user.target_sheet_id;

    if (!folderId) {
      folderId = await getOrCreateReceiptsFolder(req.googleAuthClient);
    }

    if (!sheetId) {
      sheetId = await getOrCreateReceiptTrackerSheet(req.googleAuthClient, folderId);
    }

    if (folderId !== req.user.target_folder_id || sheetId !== req.user.target_sheet_id) {
      userQueries.updateUserTargets(req.user.id, {
        target_folder_id: folderId,
        target_sheet_id: sheetId,
      });
    }

    const uploadResult = await uploadReceiptImage(
      req.googleAuthClient,
      folderId,
      temp.file_path,
      temp.mime_type,
      temp.original_name
    );

    await appendReceiptRow(
      req.googleAuthClient,
      sheetId,
      verifiedData,
      uploadResult.webViewLink
    );

    try {
      if (fs.existsSync(temp.file_path)) fs.unlinkSync(temp.file_path);
      uploadQueries.deleteTempUpload(tempImageId);
    } catch (_) {}

    res.json({
      success: true,
      driveFileUrl: uploadResult.webViewLink,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    });
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({
      error: err.message || 'Failed to save receipt to Google Sheets / Drive',
    });
  }
});

// 4. Discard unsubmitted temp receipt
router.post('/discard', requireAuth, (req, res) => {
  const { tempImageId } = req.body;
  if (!tempImageId) {
    return res.status(400).json({ error: 'Missing tempImageId' });
  }

  const temp = uploadQueries.getTempUpload(tempImageId);
  if (temp && temp.user_id === req.user.id) {
    try {
      if (fs.existsSync(temp.file_path)) fs.unlinkSync(temp.file_path);
    } catch (_) {}
    uploadQueries.deleteTempUpload(tempImageId);
  }

  res.json({ success: true });
});

export default router;
