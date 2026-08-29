import * as XLSX from 'xlsx';
import { User, SchoolClassSection } from '../types';

export interface ParsedStudentRow {
  nationalId: string;
  name: string;
  className: string;
  sectionName: string;
  parentMobile: string;
  valid: boolean;
  error?: string;
}

export function parseExcelFileBuffer(buffer: ArrayBuffer): {
  students: ParsedStudentRow[];
  detectedClasses: { className: string; sections: string[] }[];
  sheetNames: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  
  if (sheetNames.length === 0) {
    throw new Error('الملف فارغ ولا يحتوي على أي أوراق عمل');
  }

  // Find sheet with student data (e.g. Sheet2 or first sheet that has rows)
  let selectedSheet = workbook.Sheets[sheetNames[0]];
  for (const name of sheetNames) {
    const s = workbook.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json(s, { header: 1 }) as any[][];
    if (rawData.length > 2) {
      selectedSheet = s;
      break;
    }
  }

  const rawRows = XLSX.utils.sheet_to_json(selectedSheet, { header: 1 }) as any[][];
  
  if (!rawRows || rawRows.length < 2) {
    throw new Error('لا توجد بيانات كافية في ورقة العمل المحددة');
  }

  // Detect header row (look for keywords like "اسم الطالب", "رقم الطالب", "الجوال", "الفصل", "رقم الصف")
  let headerIndex = -1;
  let colMap = {
    nationalId: -1,
    name: -1,
    className: -1,
    sectionName: -1,
    parentMobile: -1,
  };

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r] || [];
    row.forEach((cellVal: any, colIdx: number) => {
      if (!cellVal) return;
      const str = String(cellVal).trim().toLowerCase();
      if (str.includes('رقم الطالب') || str.includes('السجل المدني') || str.includes('الهوية') || str.includes('student id') || str === 'f') {
        colMap.nationalId = colIdx;
        headerIndex = r;
      }
      if (str.includes('اسم الطالب') || str.includes('اسم') || str.includes('student name')) {
        colMap.name = colIdx;
        headerIndex = r;
      }
      if (str.includes('رقم الصف') || str.includes('الصف') || str.includes('grade') || str.includes('class')) {
        colMap.className = colIdx;
        headerIndex = r;
      }
      if (str.includes('الفصل') || str.includes('section') || str.includes('الشعبة')) {
        colMap.sectionName = colIdx;
        headerIndex = r;
      }
      if (str.includes('الجوال') || str.includes('ولي الامر') || str.includes('ولي الأمر') || str.includes('mobile') || str.includes('phone')) {
        colMap.parentMobile = colIdx;
        headerIndex = r;
      }
    });

    if (colMap.name !== -1 && (colMap.nationalId !== -1 || colMap.className !== -1)) {
      break;
    }
  }

  // Fallback defaults if header not found directly by name (e.g. Standard layout from screenshot: B=الجوال, C=الفصل, D=رقم الصف, E=اسم الطالب, F=رقم الطالب)
  if (colMap.name === -1 && colMap.nationalId === -1) {
    // Check if row has data in columns 1 to 5 (0-indexed: 1=B, 2=C, 3=D, 4=E, 5=F)
    colMap = {
      parentMobile: 1,
      sectionName: 2,
      className: 3,
      name: 4,
      nationalId: 5,
    };
    headerIndex = 3; // header starts around row 4 (index 3)
  }

  const students: ParsedStudentRow[] = [];
  const classesMap = new Map<string, Set<string>>();

  const startRow = headerIndex >= 0 ? headerIndex + 1 : 1;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawName = row[colMap.name];
    const rawId = row[colMap.nationalId];
    const rawClass = row[colMap.className];
    const rawSection = row[colMap.sectionName];
    const rawMobile = row[colMap.parentMobile];

    if (!rawName && !rawId) continue;

    const name = rawName ? String(rawName).trim() : '';
    let nationalId = rawId ? String(rawId).trim() : '';
    let className = rawClass ? String(rawClass).trim() : 'الصف الأول';
    let sectionName = rawSection ? String(rawSection).trim() : '1';
    let parentMobile = rawMobile ? String(rawMobile).trim() : '';

    // If national ID is missing, generate a deterministic temp ID
    if (!nationalId) {
      nationalId = `10${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    // Format mobile if starts with 966 or 05
    if (parentMobile.startsWith('966')) {
      parentMobile = '0' + parentMobile.slice(3);
    }

    // Validate
    let valid = true;
    let error = '';
    if (!name || name.length < 3) {
      valid = false;
      error = 'اسم الطالب قصير جداً أو غير صالح';
    }

    students.push({
      nationalId,
      name,
      className,
      sectionName,
      parentMobile,
      valid,
      error,
    });

    if (valid) {
      if (!classesMap.has(className)) {
        classesMap.set(className, new Set());
      }
      classesMap.get(className)?.add(sectionName);
    }
  }

  const detectedClasses: { className: string; sections: string[] }[] = [];
  classesMap.forEach((sectionsSet, cName) => {
    detectedClasses.push({
      className: cName,
      sections: Array.from(sectionsSet).sort(),
    });
  });

  return {
    students,
    detectedClasses,
    sheetNames,
  };
}

/**
 * Generate a downloadable sample Excel file matching the exact schema
 */
export function generateSampleExcelTemplate(): Blob {
  const sampleData = [
    ['Student Info Table', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', 'الجوال', 'الفصل', 'رقم الصف', 'اسم الطالب', 'رقم الطالب'],
    ['', '966552173551', '1', '1314', 'أحمد فارس عبدالله هادي العدواني', '2497120754'],
    ['', '966554160393', '1', '1314', 'أحمد ماطر يحيى خبراني', '1158481828'],
    ['', '966559099996', '1', '1314', 'أحمد مفرح أحمد عسيري', '11554011677'],
    ['', '966504477473', '1', '1314', 'أسامة يحيى محمد عسيري', '1155128521'],
    ['', '966552013617', '1', '1314', 'بتال أحمد بن عبدالله قبطي', '1154779811'],
    ['', '966557490524', '1', '1314', 'ثامر أحمد عبدالوهاب عسيري', '1155791906'],
    ['', '966559048444', '1', '1314', 'حاتم محمد عوضه الأحمري', '1157187236'],
    ['', '966558271278', '1', '1314', 'حمزه عبده عبدالله الحدواني', '9000249616'],
    ['', '966555541848', '1', '1314', 'زياد أحمد علي مدخلي', '1156555994'],
    ['', '966552246664', '1', '1314', 'سعود علي ابن عبده الزبيدي', '1156556550'],
    ['', '966506170804', '1', '1314', 'سلمان علي بن فرحان آل عامر', '1158051514'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet2');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
