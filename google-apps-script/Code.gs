/**
 * Reesivoo Master Google Apps Script Webhook
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets (or Google Drive) and create a new script at https://script.google.com/
 * 2. Paste this entire file into Code.gs
 * 3. Click "Deploy" > "New deployment"
 * 4. Select type: "Web app"
 * 5. Configuration:
 *    - Description: "Reesivoo Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (allows Reesivoo server to call it)
 * 6. Click "Deploy", authorize permissions, and COPY the Web App URL.
 * 7. Paste that Web App URL into Reesivoo Admin Settings!
 */

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var targetSheetId = contents.targetSheetId;
    var targetFolderId = contents.targetFolderId;
    var data = contents.data;
    var imageBase64 = contents.imageBase64;
    var mimeType = contents.mimeType || 'image/jpeg';
    var filename = contents.filename || ('receipt_' + new Date().getTime() + '.jpg');

    if (!targetSheetId) {
      return respondJson({ success: false, error: 'targetSheetId is required' });
    }

    // 1. Save Image to Google Drive
    var driveFileUrl = '';
    if (imageBase64) {
      try {
        var folder;
        if (targetFolderId) {
          folder = DriveApp.getFolderById(targetFolderId);
        } else {
          // Look for or create default "Receipts (Reesivoo)" folder
          var folders = DriveApp.getFoldersByName('Receipts (Reesivoo)');
          if (folders.hasNext()) {
            folder = folders.next();
          } else {
            folder = DriveApp.createFolder('Receipts (Reesivoo)');
          }
        }

        var decoded = Utilities.base64Decode(imageBase64);
        var blob = Utilities.newBlob(decoded, mimeType, filename);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveFileUrl = file.getUrl();
      } catch (driveErr) {
        Logger.log('Drive upload warning: ' + driveErr.toString());
      }
    }

    // 2. Open User's Private Google Sheet
    var spreadsheet = SpreadsheetApp.openById(targetSheetId);
    var sheet = spreadsheet.getSheets()[0]; // First sheet / tab

    // Check if Row 1 has headers; if not, initialize them
    var headers = [
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

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#EEF2F6');
      sheet.setFrozenRows(1);
    }

    // 3. Prepare row values
    var amount = (data.amount !== null && data.amount !== undefined && data.amount !== '') 
      ? Number(data.amount) 
      : '';
    var linkFormula = driveFileUrl 
      ? '=HYPERLINK("' + driveFileUrl + '", "View Receipt")' 
      : '';

    var newRow = [
      data.date || '',
      data.payee || '',
      data.tin || '',
      data.address || '',
      data.invoiceNo || '',
      data.category || 'Others',
      data.remarks || '',
      amount,
      linkFormula
    ];

    sheet.appendRow(newRow);

    return respondJson({
      success: true,
      driveFileUrl: driveFileUrl,
      sheetUrl: spreadsheet.getUrl(),
      rowNumber: sheet.getLastRow()
    });

  } catch (err) {
    return respondJson({
      success: false,
      error: err.toString()
    });
  }
}

function doGet(e) {
  return respondJson({
    status: 'ok',
    message: 'Reesivoo Google Apps Script Webhook is active and listening.'
  });
}

function respondJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
