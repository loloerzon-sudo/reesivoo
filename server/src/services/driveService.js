import { google } from 'googleapis';
import fs from 'fs';

export async function getOrCreateReceiptsFolder(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  // Search for existing folder
  const response = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and name = 'Receipts (Reesivoo)' and trashed = false",
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create new folder if not found
  const folder = await drive.files.create({
    requestBody: {
      name: 'Receipts (Reesivoo)',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, name',
  });

  return folder.data.id;
}

export async function uploadReceiptImage(authClient, folderId, filePath, mimeType, originalName) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const fileMetadata = {
    name: originalName || `receipt_${Date.now()}.jpg`,
    parents: folderId ? [folderId] : [],
  };

  const media = {
    mimeType: mimeType || 'image/jpeg',
    body: fs.createReadStream(filePath),
  };

  // Upload file
  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = file.data.id;

  // Set file permission to "anyone with the link can view"
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permError) {
    console.warn('Could not set public permission on Drive file:', permError.message);
  }

  // Re-fetch file webViewLink to guarantee it is shareable
  const updatedFile = await drive.files.get({
    fileId: fileId,
    fields: 'id, webViewLink',
  });

  return {
    fileId: fileId,
    webViewLink: updatedFile.data.webViewLink || file.data.webViewLink,
  };
}
