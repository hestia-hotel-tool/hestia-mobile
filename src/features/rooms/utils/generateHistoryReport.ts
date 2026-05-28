import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getMessageModal, getToast } from '@shared/utils/toast';
import type { HistoryEvent, HistoryGroup } from '../types/roomDetail.types';

interface GenerateReportOptions {
  roomNumber: string;
  roomCode?: string;
  events: HistoryEvent[];
  groupedEvents: HistoryGroup[];
}

/**
 * Generates a PDF report from history events and downloads/shares it
 */
export async function generateHistoryReport({
  roomNumber,
  roomCode,
  events,
  groupedEvents,
}: GenerateReportOptions): Promise<void> {
  try {
    // Generate HTML content for the PDF
    const htmlContent = generateReportHTML({
      roomNumber,
      roomCode,
      events,
      groupedEvents,
    });

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Room_${roomNumber}_History_Report_${timestamp}.pdf`;
    
    // Save to documents directory first
    const documentsUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: documentsUri,
    });

    // Show options to user: Download to Device or Share
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
                  dialogTitle: `Room ${roomNumber} History Report`,
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
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Downloads the PDF file directly to the device
 */
async function downloadToDevice(
  fileUri: string,
  filename: string,
  roomNumber: string
): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // For Android, try to use StorageAccessFramework if available
      // Otherwise, the file is already saved in documents directory
      try {
        // Check if StorageAccessFramework is available (it might not be in legacy API)
        if (FileSystem.StorageAccessFramework) {
          // Request permission to access Downloads folder
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (!permissions.granted) {
            getMessageModal()?.show({
              title: 'Permission Required',
              message: 'Storage permission is required to save the file to Downloads.',
              buttons: [{ text: 'OK' }],
            });
            return;
          }

          // Read the file content
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Create the file in the selected directory
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/pdf'
          );

          // Write the file content
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

/**
 * Generates HTML content for the PDF report
 */
function generateReportHTML({
  roomNumber,
  roomCode,
  events,
  groupedEvents,
}: GenerateReportOptions): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Format timestamp for display
  const formatTimestamp = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${hours}:${minutes} | ${day} ${month}`;
  };

  // Generate events HTML
  const eventsHTML = groupedEvents
    .map((group) => {
      const groupTitle = group.dateLabel;
      const eventsList = group.events
        .map((event) => {
          const staffName = event.staff.name;
          const action = event.action;
          const timestamp = formatTimestamp(event.timestamp);
          return `
            <div class="event-item">
              <div class="event-description">
                <strong>${staffName}</strong> ${action}
              </div>
              <div class="event-timestamp">
                ${timestamp}
              </div>
            </div>
          `;
        })
        .join('');

      const isToday = groupTitle === 'Today';
      const dateHeader = isToday
        ? `<div class="date-header">${groupTitle}</div>`
        : `
          <div class="date-header-with-line">
            <hr />
            <h3>${groupTitle}</h3>
            <hr />
          </div>
        `;

      return `<div class="event-group">${dateHeader}${eventsList}</div>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Room ${roomNumber} History Report</title>
        <style>
          * {
            box-sizing: border-box;
          }
          
          @page {
            margin: 20px;
            size: A4;
          }
          
          @media print {
            @page {
              margin: 15mm;
            }
            body {
              font-size: 12px;
            }
            .header h1 {
              font-size: 20px;
            }
            .summary {
              padding: 12px;
            }
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #000000;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            font-size: 14px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .header {
            border-bottom: 2px solid #5a759d;
            padding-bottom: 15px;
            margin-bottom: 20px;
            width: 100%;
          }
          
          .header h1 {
            font-size: clamp(18px, 4vw, 24px);
            font-weight: bold;
            color: #1e1e1e;
            margin: 0 0 6px 0;
            word-wrap: break-word;
            line-height: 1.3;
          }
          
          .header .room-code {
            font-size: clamp(14px, 3vw, 16px);
            color: #666666;
            margin: 0 0 6px 0;
            word-wrap: break-word;
          }
          
          .header .date {
            font-size: clamp(12px, 2.5vw, 14px);
            color: #999999;
            margin: 0;
          }
          
          .summary {
            background-color: #F1F6FC;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            width: 100%;
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .summary-item:last-child {
            margin-bottom: 0;
          }
          
          .summary-label {
            font-size: clamp(12px, 2.5vw, 14px);
            color: #666666;
            flex: 1;
            min-width: 120px;
          }
          
          .summary-value {
            font-size: clamp(12px, 2.5vw, 14px);
            font-weight: bold;
            color: #1e1e1e;
            text-align: right;
            word-wrap: break-word;
            max-width: 60%;
          }
          
          .events-section {
            margin-top: 20px;
            width: 100%;
          }
          
          .events-section h2 {
            font-size: clamp(16px, 3.5vw, 18px);
            font-weight: bold;
            color: #1e1e1e;
            margin-bottom: 15px;
            line-height: 1.3;
          }
          
          .event-group {
            margin-bottom: 20px;
            width: 100%;
          }
          
          .date-header {
            font-size: clamp(13px, 3vw, 14px);
            font-weight: bold;
            color: #1e1e1e;
            margin: 20px 0 12px 0;
            line-height: 1.3;
          }
          
          .date-header-with-line {
            display: flex;
            align-items: center;
            margin: 25px 0 12px 0;
            width: 100%;
          }
          
          .date-header-with-line hr {
            flex: 1;
            border: none;
            border-top: 1px solid #E0E0E0;
            margin: 0 10px;
          }
          
          .date-header-with-line h3 {
            font-size: clamp(13px, 3vw, 14px);
            font-weight: bold;
            color: #1e1e1e;
            padding: 0 10px;
            white-space: nowrap;
            line-height: 1.3;
          }
          
          .event-item {
            margin-bottom: 12px;
            padding-left: 20px;
            border-left: 2px solid #E4EBF5;
            padding-bottom: 6px;
            width: 100%;
            word-wrap: break-word;
          }
          
          .event-description {
            font-size: clamp(12px, 2.5vw, 14px);
            color: #000000;
            margin-bottom: 4px;
            line-height: 1.4;
            word-wrap: break-word;
          }
          
          .event-description strong {
            font-weight: 600;
          }
          
          .event-timestamp {
            font-size: clamp(11px, 2.2vw, 12px);
            color: #999999;
            line-height: 1.3;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #E0E0E0;
            text-align: center;
            font-size: clamp(10px, 2vw, 12px);
            color: #999999;
            width: 100%;
          }
          
          .footer p {
            margin: 4px 0;
            line-height: 1.4;
          }
          
          /* Ensure content doesn't overflow */
          @media screen and (max-width: 480px) {
            body {
              font-size: 12px;
            }
            .summary {
              padding: 10px;
            }
            .event-item {
              padding-left: 15px;
            }
            .date-header-with-line h3 {
              font-size: 12px;
              padding: 0 8px;
            }
          }
          
          /* Landscape orientation adjustments */
          @media screen and (orientation: landscape) {
            .header h1 {
              font-size: 22px;
            }
            .summary-item {
              flex-direction: row;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Room ${roomNumber}${roomCode ? ` - ${roomCode}` : ''}</h1>
          <div class="room-code">History Report</div>
          <div class="date">Generated on ${currentDate}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Total Events:</span>
            <span class="summary-value">${events.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Date Range:</span>
            <span class="summary-value">${groupedEvents.length > 0 ? `${groupedEvents[groupedEvents.length - 1].dateLabel} - ${groupedEvents[0].dateLabel}` : 'N/A'}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Number of Days:</span>
            <span class="summary-value">${groupedEvents.length}</span>
          </div>
        </div>

        <div class="events-section">
          <h2>Activity Timeline</h2>
          ${eventsHTML}
        </div>

        <div class="footer">
          <p>This report was generated automatically by Hestia App</p>
          <p>© ${new Date().getFullYear()} Hestia. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}
