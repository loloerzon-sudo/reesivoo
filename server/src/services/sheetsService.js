import { google } from 'googleapis';

const SHEET_HEADERS = [
  'Date',
  'Payee',
  'TIN',
  'Address',
  'Invoice / OR #',
  'Category',
  'Remarks / Description',
  'Amount',
  'Receipt Link'
];

export async function getOrCreateReceiptTrackerSheet(authClient, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Look for existing spreadsheet
  const query = "mimeType = 'application/vnd.google-apps.spreadsheet' and name = 'Receipt Tracker' and trashed = false";
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }

  // Create new spreadsheet inside folder
  const fileMetadata = {
    name: 'Receipt Tracker',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: folderId ? [folderId] : [],
  };

  const newSheetFile = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, webViewLink',
  });

  const spreadsheetId = newSheetFile.data.id;

  // Initialize Row 1 with headers and format them (bold, frozen top row)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1:I1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [SHEET_HEADERS],
    },
  });

  // Freeze top row and format headers
  try {
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheetId = spreadsheetInfo.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Freeze row 1
          {
            updateSheetProperties: {
              properties: {
                sheetId: firstSheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          // Format Row 1 (Bold text + soft slate background)
          {
            repeatCell: {
              range: {
                sheetId: firstSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: SHEET_HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.93, green: 0.95, blue: 0.98 },
                  textFormat: { bold: true, fontSize: 10 },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
        ],
      },
    });
  } catch (fmtError) {
    console.warn('Could not apply formatting to new sheet:', fmtError.message);
  }

  return spreadsheetId;
}

export async function appendReceiptRow(authClient, spreadsheetId, data, driveLink) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const amountVal = data.amount !== null && data.amount !== undefined && data.amount !== ''
    ? Number(data.amount)
    : '';

  const hyperlinkFormula = driveLink ? `=HYPERLINK("${driveLink}", "View Receipt")` : '';

  const rowValues = [
    data.date || '',
    data.payee || '',
    data.tin || '',
    data.address || '',
    data.invoiceNo || '',
    data.category || 'Others',
    data.remarks || '',
    amountVal,
    hyperlinkFormula,
  ];

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowValues],
    },
  });

  return result.data;
}
