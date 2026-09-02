// Excel Parser & Exporter using xlsx
import * as XLSX from 'xlsx';
import { User, Attendance } from '../types';

export interface ParsedStudentRow {
  name: string;
  nationalId: string;
  className: string;
  sectionName: string;
  parentMobile?: string;
  studentMobile?: string;
}

export function parseNoorExcelFile(file: File): Promise<ParsedStudentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: Record<string, string | number>[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Analyze rows to find headers and data
        const results: ParsedStudentRow[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as unknown as (string | number | undefined)[];
          if (!row || row.length === 0) continue;

          // Try common Noor columns: Name, National ID, Class, Section, Parent Phone
          const rawName = String(row[0] || row[1] || '').trim();
          const rawNid = String(row[1] || row[0] || '').replace(/\D/g, '');
          const rawClass = String(row[2] || 'الأول المتوسط').trim();
          const rawSection = String(row[3] || '1').trim();
          const rawParentPhone = String(row[4] || '').replace(/\D/g, '');

          if (rawName && (rawNid.length === 10 || rawNid.length >= 8)) {
            results.push({
              name: rawName,
              nationalId: rawNid,
              className: rawClass,
              sectionName: rawSection,
              parentMobile: rawParentPhone.length >= 9 ? rawParentPhone : undefined,
            });
          }
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function exportAttendanceToExcel(attendances: Attendance[], schoolName: string, date: string) {
  const data = attendances.map((a, idx) => ({
    'م': idx + 1,
    'اسم الطالب': a.studentName,
    'رقم الهوية': a.nationalId,
    'الصف': a.className,
    'الفصل': a.sectionName,
    'وقت التحضير الذاتي': a.selfCheckTime || 'لم يحضر ذاتياً',
    'رصد المعلم': a.teacherMark === 'present' ? 'حاضر' : a.teacherMark === 'absent' ? 'غائب' : a.teacherMark === 'late' ? 'متأخر' : 'لم يُرصد',
    'الحالة النهائية': a.finalStatus === 'present' ? 'حاضر' : a.finalStatus === 'absent' ? 'غائب' : a.finalStatus === 'late' ? 'متأخر' : 'مستأذن',
    'حالة الهروب/التباين': a.isTruant ? '⚠️ تم كشف هروب/تباين' : 'مطابق',
    'جوال ولي الأمر': a.parentMobile || '--',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الحضور');
  XLSX.writeFile(workbook, `تقرير_حضور_${schoolName}_${date}.xlsx`);
}
