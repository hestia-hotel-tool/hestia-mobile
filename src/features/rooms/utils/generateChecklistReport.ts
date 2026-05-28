import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getMessageModal, getToast } from '@shared/utils/toast';
import type { ChecklistData } from '../types/checklist.types';

interface GenerateChecklistReportOptions {
  roomNumber: string;
  roomCode?: string;
  checklistData: ChecklistData;
}

/**
 * Generates a PDF report from checklist/consumption data and downloads/shares it.
 * Only includes items with quantity > 0 (consumed products).
 */
export async function generateChecklistReport({
  roomNumber,
  roomCode,
  checklistData,
}: GenerateChecklistReportOptions): Promise<void> {
  try {
    const htmlContent = generateChecklistReportHTML({
      roomNumber,
      roomCode,
      checklistData,
    });

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Room_${roomNumber}_Checklist_Report_${timestamp}.pdf`;

    const documentsUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: documentsUri,
    });

    getMessageModal()?.show({
      title: 'Download Report',
      message: 'Choose how you want to save the report:',
      buttons: [
        {
          text: 'Download to Device',
          onPress: async () => {
            try {
              await downloadToDevice(documentsUri, filename, roomNumber);
            } catch (error) {
              console.error('Error downloading to device:', error);
              getToast()?.show('Failed to download to device. Please try sharing instead.', { type: 'error', title: 'Error' });
            }
          },
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(documentsUri, {
                  mimeType: 'application/pdf',
                  dialogTitle: `Room ${roomNumber} Checklist Report`,
                });
              } else {
                getToast()?.show('Sharing is not available on this device.', { type: 'error', title: 'Sharing not available' });
              }
            } catch (error) {
              console.error('Error sharing:', error);
              getToast()?.show('Failed to share report. Please try again.', { type: 'error', title: 'Error' });
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      cancelable: true,
    });
  } catch (error) {
    console.error('Error generating checklist PDF report:', error);
    throw error;
  }
}

async function downloadToDevice(
  fileUri: string,
  filename: string,
  roomNumber: string
): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      try {
        if (FileSystem.StorageAccessFramework) {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

          if (!permissions.granted) {
            getMessageModal()?.show({
              title: 'Permission Required',
              message: 'Storage permission is required to save the file to Downloads.',
              buttons: [{ text: 'OK' }],
            });
            return;
          }

          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/pdf'
          );

          await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
            encoding: FileSystem.EncodingType.Base64,
          });

          getMessageModal()?.show({
            title: 'Download Complete',
            message: `Report saved to Downloads folder as "${filename}"`,
            buttons: [{ text: 'OK' }],
          });
        } else {
          getMessageModal()?.show({
            title: 'Download Complete',
            message: `Report saved to device storage as "${filename}".\n\nThe file has been saved to your device and you can access it through your file manager.`,
            buttons: [{ text: 'OK' }],
          });
        }
      } catch (error) {
        console.error('Error saving to Downloads:', error);
        getMessageModal()?.show({
          title: 'Download Complete',
          message: `Report saved to device storage as "${filename}".\n\nThe file has been saved and you can access it through your device's file manager.`,
          buttons: [{ text: 'OK' }],
        });
      }
    } else {
      getMessageModal()?.show({
        title: 'Download Complete',
        message: `Report saved to device as "${filename}".\n\nYou can access it through the Files app or share it using the Share option.`,
        buttons: [{ text: 'OK' }],
      });
    }
  } catch (error) {
    console.error('Error in downloadToDevice:', error);
    getMessageModal()?.show({
      title: 'Download Complete',
      message: `Report saved to device storage as "${filename}".\n\nThe file has been saved and you can access it through your device's file manager.`,
      buttons: [{ text: 'OK' }],
    });
  }
}

function generateChecklistReportHTML({
  roomNumber,
  roomCode,
  checklistData,
}: GenerateChecklistReportOptions): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter to only consumed items (quantity > 0) and group by category
  const consumedByCategory = checklistData.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.quantity > 0),
    }))
    .filter((category) => category.items.length > 0);

  const totalConsumed = consumedByCategory.reduce(
    (sum, cat) => sum + cat.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  const categoriesHTML = consumedByCategory
    .map((category) => {
      const itemsHTML = category.items
        .map(
          (item) => `
        <div class="consumption-item">
          <span class="item-name">${item.name}</span>
          <span class="item-quantity">${item.quantity}</span>
        </div>
      `
        )
        .join('');

      return `
        <div class="category-group">
          <h3 class="category-name">${category.name}</h3>
          ${itemsHTML}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Room ${roomNumber} Checklist Report</title>
        <style>
          * { box-sizing: border-box; }
          @page { margin: 20px; size: A4; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #000000;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            font-size: 14px;
          }
          .header {
            border-bottom: 2px solid #5a759d;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1e1e1e;
            margin: 0 0 6px 0;
          }
          .header .room-code { font-size: 16px; color: #666666; margin: 0 0 6px 0; }
          .header .date { font-size: 14px; color: #999999; margin: 0; }
          .summary {
            background-color: #F1F6FC;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .summary-item:last-child { margin-bottom: 0; }
          .summary-label { font-size: 14px; color: #666666; }
          .summary-value { font-size: 14px; font-weight: bold; color: #1e1e1e; }
          .category-group {
            margin-bottom: 20px;
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
          }
          .category-name {
            font-size: 16px;
            font-weight: bold;
            color: #1e1e1e;
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          .consumption-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 4px 0;
          }
          .consumption-item:last-child { margin-bottom: 0; }
          .item-name { font-size: 14px; color: #000000; }
          .item-quantity { font-size: 14px; font-weight: bold; color: #5a759d; }
          .registered-by {
            margin-top: 24px;
            padding-top: 15px;
            border-top: 1px solid #E0E0E0;
            font-size: 12px;
            color: #666666;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #E0E0E0;
            text-align: center;
            font-size: 12px;
            color: #999999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Room ${roomNumber}${roomCode ? ` - ${roomCode}` : ''}</h1>
          <div class="room-code">Checklist / Consumption Report</div>
          <div class="date">Generated on ${currentDate}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Total Items Consumed:</span>
            <span class="summary-value">${totalConsumed}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Registered By:</span>
            <span class="summary-value">${checklistData.registeredBy.name}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Registered At:</span>
            <span class="summary-value">${checklistData.registeredAt.date} ${checklistData.registeredAt.time}</span>
          </div>
        </div>

        <h2 style="font-size: 18px; margin-bottom: 12px;">Consumed Products</h2>
        ${categoriesHTML}

        <div class="footer">
          <p>This report was generated automatically by Hestia App</p>
          <p>© ${new Date().getFullYear()} Hestia. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}
