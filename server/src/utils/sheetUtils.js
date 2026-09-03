/**
 * Extracts clean Google Sheet ID from either a raw ID or full Google Sheets URL
 */
export function extractSheetId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If no URL pattern matched, treat input as raw ID
  return trimmed;
}

/**
 * Extracts clean Google Drive Folder ID from either a raw ID or full Drive folder URL
 */
export function extractFolderId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
