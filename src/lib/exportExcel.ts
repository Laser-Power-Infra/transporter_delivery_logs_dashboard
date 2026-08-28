import * as XLSX from 'xlsx';
import { Delivery } from '@/types';

export const EXCEL_COLUMNS = [
  { label: 'DI NO', key: 'diNo' },
  { label: 'INVOICE NO', key: 'invoiceNo' },
  { label: 'Date', key: 'date' },
  { label: 'Buyer Name', key: 'buyerName' },
  { label: 'Transporter Name', key: 'transporterName' },
  { label: 'TRUCK NUMBER', key: 'truckNumber' },
  { label: 'Driver Contact No', key: 'driverContactNo' },
  { label: 'LR. NO', key: 'lrNo' },
  { label: 'FREIGHT ORDER', key: 'freightOrder' },
  { label: 'To Place Name', key: 'toPlaceName' },
  { label: 'Address', key: 'address' },
  { label: 'Item Name', key: 'itemName' },
  { label: 'Drum Qty', key: 'drumQty' },
  { label: 'DELIVERY STATUS', key: 'deliveryStatus' },
  { label: 'Remarks', key: 'remarks' },
  { label: 'DELIVERY REMARKS', key: 'deliveryRemarks' },
  { label: 'VEHICLE REACHED DATE', key: 'vehicleReachedDate' },
  { label: 'DELIVERY DATE', key: 'deliveryDate' },
];

export function exportDeliveriesToExcel(deliveries: Delivery[], customFilename?: string) {
  if (!deliveries || deliveries.length === 0) {
    alert('No delivery records available to export.');
    return;
  }

  // Map Delivery objects to clean Excel rows matching sheet columns A to R
  const exportRows = deliveries.map((d) => ({
    'DI NO': d.diNo || '',
    'INVOICE NO': d.invoiceNo || '',
    'Date': d.date || '',
    'Buyer Name': d.buyerName || '',
    'Transporter Name': d.transporterName || '',
    'TRUCK NUMBER': d.truckNumber || '',
    'Driver Contact No': d.driverContactNo || '',
    'LR. NO': d.lrNo || '',
    'FREIGHT ORDER': d.freightOrder || '',
    'To Place Name': d.toPlaceName || '',
    'Address': d.address || '',
    'Item Name': d.itemName || '',
    'Drum Qty': d.drumQty || '',
    'DELIVERY STATUS': d.deliveryStatus || '',
    'Remarks': d.remarks || '',
    'DELIVERY REMARKS': d.deliveryRemarks || '',
    'VEHICLE REACHED DATE': d.vehicleReachedDate || '',
    'DELIVERY DATE': d.deliveryDate || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 15 }, // DI NO
    { wch: 18 }, // INVOICE NO
    { wch: 14 }, // Date
    { wch: 28 }, // Buyer Name
    { wch: 26 }, // Transporter Name
    { wch: 16 }, // TRUCK NUMBER
    { wch: 16 }, // Driver Contact No
    { wch: 16 }, // LR NO
    { wch: 16 }, // FREIGHT ORDER
    { wch: 20 }, // To Place Name
    { wch: 30 }, // Address
    { wch: 25 }, // Item Name
    { wch: 12 }, // Drum Qty
    { wch: 18 }, // DELIVERY STATUS
    { wch: 20 }, // Remarks
    { wch: 20 }, // DELIVERY REMARKS
    { wch: 20 }, // VEHICLE REACHED DATE
    { wch: 20 }, // DELIVERY DATE
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `Delivery_Report_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
