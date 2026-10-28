import { NextResponse } from 'next/server';
import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const filePath = path.join(dataDir, 'rock key1.xlsm');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, data: [], error: 'ملف الإكسيل غير موجود' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // 1. قراءة شيت "Units Data"
    const unitsDataSheetName = workbook.SheetNames.includes('Units Data') ? 'Units Data' : workbook.SheetNames[0];
    const unitsWorksheet = workbook.Sheets[unitsDataSheetName];
    const unitsRows = XLSX.utils.sheet_to_json(unitsWorksheet, { header: 1 });

    const unitContractsMap = new Map();

    if (unitsRows && unitsRows.length >= 7) {
      for (let i = 6; i < unitsRows.length; i++) {
        const row = unitsRows[i];
        if (!row || row.length === 0) continue;

        const unitNumber = String(row[1] || '').trim(); // العمود B
        const building = String(row[2] || '').trim();     // العمود C
        const remainingStatus = String(row[3] || '').trim(); // العمود D
        const tenantName = row[4] || 'شاغرة';             // العمود E
        const phone = row[6] !== undefined ? String(row[6]).trim() : ''; // العمود G
        const contractNumber = row[8] !== undefined ? row[8] : '-'; // العمود I
        const monthlyRentFromM = row[12] !== undefined ? row[12] : 0; // العمود M: الإيجار الشهري[cite: 5]
        const endDate = row[14] || '-';                             // العمود O
        
        if (building && unitNumber) {
          const cleanStatus = remainingStatus.toLowerCase().replace(/\s+/g, '');
          let statusCategory = 'مؤجر';

          if (cleanStatus.includes('منتهي') || cleanStatus.includes('expired') || cleanStatus.includes('منته')) {
            statusCategory = 'منتهي';
          } else if (cleanStatus.includes('تصفية') || cleanStatus.includes('تصقية') || cleanStatus.includes('صفية')) {
            statusCategory = 'بانتظار التصفية';
          }

          const normalizedBuilding = building.toLowerCase();
          const normalizedUnit = unitNumber.toLowerCase();
          const key = `${normalizedBuilding}_${normalizedUnit}`;

          if (!unitContractsMap.has(key)) {
            unitContractsMap.set(key, []);
          }

          unitContractsMap.get(key).push({
            'رقم العقد': contractNumber,
            'رقم التواصل': phone,
            'المتبقي في العقد': remainingStatus,
            'اسم المستأجر': tenantName,
            'الإيجار الشهري': monthlyRentFromM,
            'تاريخ نهاية العقد': endDate,
            'حالة العقد': statusCategory
          });
        }
      }
    }

    // 2. قراءة شيت "الوحدات والمباني" الهيكلي لضمان ظهور كل وحدة مسجلة
    const masterSheetName = workbook.SheetNames.includes('الوحدات والمباني') ? 'الوحدات والمباني' : workbook.SheetNames[1] || workbook.SheetNames[0];
    const masterWorksheet = workbook.Sheets[masterSheetName];
    const masterRows = XLSX.utils.sheet_to_json(masterWorksheet, { header: 1 });

    const finalProperties = [];

    if (masterRows && masterRows.length > 0) {
      const headerRow = masterRows[0];

      for (let col = 1; col < headerRow.length; col++) {
        const buildingName = headerRow[col] ? String(headerRow[col]).trim() : '';
        if (!buildingName) continue;

        for (let rowIdx = 1; rowIdx < masterRows.length; rowIdx++) {
          const currentRow = masterRows[rowIdx];
          if (!currentRow) continue;

          const unitNumber = currentRow[col] !== undefined && currentRow[col] !== null 
            ? String(currentRow[col]).trim() 
            : '';

          if (unitNumber) {
            const normalizedBuilding = buildingName.toLowerCase();
            const normalizedUnit = unitNumber.toLowerCase();
            const key = `${normalizedBuilding}_${normalizedUnit}`;
            const unitContracts = unitContractsMap.get(key);

            let assignedContract = null;
            let finalStatus = 'شاغرة';

            if (unitContracts && unitContracts.length > 0) {
              // البحث عن عقد نشط (مؤجر)
              const activeContract = unitContracts.find(c => c['حالة العقد'] === 'مؤجر');
              if (activeContract) {
                assignedContract = activeContract;
                finalStatus = 'مؤجر';
              } else {
                // إذا لم يوجد عقد نشط، نأخذ آخر عقد مسجل (مثل منتهي أو تصفية) أو نعتبرها شاغرة
                assignedContract = unitContracts[unitContracts.length - 1];
                finalStatus = assignedContract['حالة العقد'];
              }
            }

            if (assignedContract && finalStatus === 'مؤجر') {
              // وحدة مؤجرة بعقد نشط
              finalProperties.push({
                'المبني': buildingName,
                'رقم الشقة': unitNumber,
                ...assignedContract,
                'الحالة النهائية': 'مؤجر',
                'isVacant': false,
                'isHistoricalExpired': false
              });
            } else if (assignedContract && finalStatus === 'بانتظار التصفية') {
              // وحدة بانتظار التصفية
              finalProperties.push({
                'المبني': buildingName,
                'رقم الشقة': unitNumber,
                ...assignedContract,
                'الحالة النهائية': 'بانتظار التصفية',
                'isVacant': false,
                'isHistoricalExpired': false
              });
            } else if (assignedContract && finalStatus === 'منتهي') {
              // وحدة عقدها منتهي (تظهر كشاغرة أو منتهية حسب المطلوب)
              finalProperties.push({
                'المبني': buildingName,
                'رقم الشقة': unitNumber,
                ...assignedContract,
                'الحالة النهائية': 'منتهي',
                'isVacant': true,
                'isHistoricalExpired': false
              });
            } else {
              // وحدة شاغرة تماماً (ليس لها أي عقد مسجل في شيت العقود)
              finalProperties.push({
                'المبني': buildingName,
                'رقم الشقة': unitNumber,
                'رقم العقد': '',
                'رقم التواصل': '',
                'المتبقي في العقد': 'شاغرة',
                'اسم المستأجر': 'شاغرة',
                'الإيجار الشهري': 0,
                'تاريخ نهاية العقد': '-',
                'الحالة النهائية': 'شاغرة',
                'isVacant': true,
                'isHistoricalExpired': false
              });
            }
          }
        }
      }
    }

    finalProperties.sort((a, b) => {
      const buildingCompare = a['المبني'].localeCompare(b['المبني'], 'ar', { numeric: true });
      if (buildingCompare !== 0) return buildingCompare;
      return a['رقم الشقة'].localeCompare(b['رقم الشقة'], 'ar', { numeric: true });
    });

    return NextResponse.json({ 
      success: true,
      count: finalProperties.length,
      data: finalProperties 
    }, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 500, success: false, data: [], error: error.message });
  }
}