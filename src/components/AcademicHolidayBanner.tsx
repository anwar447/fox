import React from 'react';
import { AcademicDayStatus, THEME_CONFIGS } from '../utils/academicCalendar';
import { Calendar, Moon, Award, Flag, Sparkles } from 'lucide-react';

interface AcademicHolidayBannerProps {
  status: AcademicDayStatus;
}

export const AcademicHolidayBanner: React.FC<AcademicHolidayBannerProps> = ({ status }) => {
  if (!status.isHoliday) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-center gap-2 animate-fadeIn" dir="rtl">
      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="font-bold">تنبيه التقويم الدراسي:</span>
      <span>{status.holidayName || 'إجازة رسمية'}</span>
      {status.description && <span className="text-amber-700 font-medium">({status.description})</span>}
    </div>
  );
};
