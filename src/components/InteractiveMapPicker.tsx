import React, { useState } from 'react';
import { 
  MapPin, Navigation, Check, X, Compass, Clock, AlertTriangle, 
  Calendar, Sunrise, Sunset, ShieldCheck, Zap
} from 'lucide-react';
import { getCurrentCoordinates } from '../utils/geo';
import { School } from '../types';
import { DEFAULT_SCHOOL_SCHEDULE, SchoolScheduleConfig } from '../utils/schoolSchedule';

interface InteractiveMapPickerProps {
  school?: School | null;
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  initialWorkStartTime?: string;
  initialLateCutoffTime?: string;
  initialAbsenceCutoffTime?: string;
  initialWorkEndTime?: string;
  onSave: (
    lat: number, 
    lng: number, 
    radius: number, 
    schedule: SchoolScheduleConfig
  ) => void;
  onClose: () => void;
}

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  school,
  initialLat,
  initialLng,
  initialRadius,
  initialWorkStartTime,
  initialLateCutoffTime,
  initialAbsenceCutoffTime,
  initialWorkEndTime,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'geofence'>('schedule');

  // Schedule States
  const [workStartTime, setWorkStartTime] = useState<string>(
    initialWorkStartTime || school?.workStartTime || DEFAULT_SCHOOL_SCHEDULE.workStartTime
  );
  const [lateCutoffTime, setLateCutoffTime] = useState<string>(
    initialLateCutoffTime || school?.lateCutoffTime || DEFAULT_SCHOOL_SCHEDULE.lateCutoffTime
  );
  const [absenceCutoffTime, setAbsenceCutoffTime] = useState<string>(
    initialAbsenceCutoffTime || school?.absenceCutoffTime || DEFAULT_SCHOOL_SCHEDULE.absenceCutoffTime
  );
  const [workEndTime, setWorkEndTime] = useState<string>(
    initialWorkEndTime || school?.workEndTime || DEFAULT_SCHOOL_SCHEDULE.workEndTime
  );

  // Geofence States
  const [lat, setLat] = useState<number>(initialLat || school?.lat || 24.7136);
  const [lng, setLng] = useState<number>(initialLng || school?.lng || 46.6753);
  const [radius, setRadius] = useState<number>(initialRadius || school?.radiusMeters || 300);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const applyPreset = (preset: 'summer' | 'winter' | 'ramadan') => {
    if (preset === 'summer') {
      setWorkStartTime('06:30');
      setLateCutoffTime('07:00');
      setAbsenceCutoffTime('08:00');
      setWorkEndTime('13:00');
    } else if (preset === 'winter') {
      setWorkStartTime('06:45');
      setLateCutoffTime('07:15');
      setAbsenceCutoffTime('08:30');
      setWorkEndTime('13:30');
    } else if (preset === 'ramadan') {
      setWorkStartTime('09:00');
      setLateCutoffTime('09:30');
      setAbsenceCutoffTime('10:30');
      setWorkEndTime('14:00');
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setStatusMsg('جاري جلب إحداثياتك الحالية بدقة عبر GPS...');
    try {
      const coords = await getCurrentCoordinates();
      setLat(Number(coords.latitude.toFixed(6)));
      setLng(Number(coords.longitude.toFixed(6)));
      setStatusMsg(`تم تحديد موقعك بدقة (دقة: ${Math.round(coords.accuracy)} متر)`);
    } catch (err: unknown) {
      const e = err as Error;
      setStatusMsg(e.message || 'تعذر تحديد الموقع');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    onSave(lat, lng, radius, {
      workStartTime,
      lateCutoffTime,
      absenceCutoffTime,
      workEndTime,
    });
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                إعدادات أوقات الدوام والتأخير والغياب والسياج الجغرافي
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {school?.name ? `مدرسة: ${school.name}` : 'ضبط قواعد التوقيت والتحضير والسياج الذكي'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>⏱️ مواعيد الدوام وقواعد التأخير والغياب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geofence')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'geofence'
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>📍 السياج الجغرافي والموقع</span>
          </button>
        </div>

        {/* TAB 1: SCHEDULE & ATTENDANCE RULES */}
        {activeTab === 'schedule' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Quick Presets */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>تطبيق نماذج توقيت جاهزة بضغطة زر:</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">اختر النموذج المناسب لمدرستك</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('summer')}
                  className="py-1.5 px-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                  <span>دوام صيفي ☀️</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('winter')}
                  className="py-1.5 px-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  <span>دوام شتوي ❄️</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ramadan')}
                  className="py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sunset className="w-3.5 h-3.5 text-emerald-600" />
                  <span>شهر رمضان 🌙</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              
              {/* 1. Work Start Time */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sunrise className="w-4 h-4 text-emerald-600" />
                    <span>بدء فتح التحضير الصباحي:</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
                    بداية اليوم
                  </span>
                </div>
                <input
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-center text-sm focus:outline-emerald-500"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  الوقت المسموح فيه ببدء استقبال حضور الطلاب ومسح الباركود الصباحي.
                </p>
              </div>

              {/* 2. Late Cutoff Time */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>حد بداية احتساب التأخير:</span>
                  </label>
                  <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
                    رصد متأخر ⚠️
                  </span>
                </div>
                <input
                  type="time"
                  value={lateCutoffTime}
                  onChange={(e) => setLateCutoffTime(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-center text-sm focus:outline-amber-500"
                />
                <p className="text-[10px] text-amber-900 leading-tight">
                  أي طالب يحضر بعد هذا الوقت يُسجل تلقائياً كـ (متأخر) وتُحسب دقائق تأخيره.
                </p>
              </div>

              {/* 3. Absence Cutoff Time */}
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-rose-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>حد إغلاق التحضير والغياب:</span>
                  </label>
                  <span className="text-[10px] text-rose-800 bg-rose-100 border border-rose-200 font-bold px-1.5 py-0.5 rounded">
                    رصد غائب ❌
                  </span>
                </div>
                <input
                  type="time"
                  value={absenceCutoffTime}
                  onChange={(e) => setAbsenceCutoffTime(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-center text-sm focus:outline-rose-500"
                />
                <p className="text-[10px] text-rose-900 leading-tight">
                  نهاية وقت التحضير الذاتي الصباحي؛ من لم يحضر بعد هذا التوقيت يُعتبر غائباً.
                </p>
              </div>

              {/* 4. Work End / Dismissal Time */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sunset className="w-4 h-4 text-indigo-600" />
                    <span>وقت نهاية الدوام والانصراف:</span>
                  </label>
                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold px-1.5 py-0.5 rounded">
                    نهاية اليوم
                  </span>
                </div>
                <input
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-center text-sm focus:outline-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  توقيت جرس الانصراف وبدء مسح مغادرة الطلاب عند البوابة المدرسية.
                </p>
              </div>

            </div>

            {/* Explanatory Summary Badge */}
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-black">
                  قواعد التوقيت النشطة لمدرستك:
                </strong>
                <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                  يفتح التحضير عند <strong className="font-mono">{workStartTime}</strong>، ويُحتسب التأخير فوراً بعد <strong className="font-mono">{lateCutoffTime}</strong>، ويُغلق التحضير الصباحي ويُثبت الغياب بعد <strong className="font-mono">{absenceCutoffTime}</strong>، وينتهي الدوام عند <strong className="font-mono">{workEndTime}</strong>.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: GEOFENCE & GPS LOCATION */}
        {activeTab === 'geofence' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* GPS Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'جاري تحديد موقعك الحالي...' : 'جلب موقعي الحالي الآن (وأنا داخل المدرسة) 📍'}</span>
              </button>
              {statusMsg && (
                <p className="text-[11px] text-emerald-800 text-center font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                  {statusMsg}
                </p>
              )}
            </div>

            {/* Coordinates inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">خط العرض (Latitude):</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-center font-bold focus:outline-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">خط الطول (Longitude):</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-center font-bold focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <label className="text-slate-900 font-bold">نطاق السياج الجغرافي المسموح به للتحضير:</label>
                <span className="font-mono font-bold text-emerald-800 px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-200">
                  {radius} متر
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="1500"
                step="25"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50 متر (مبنى صغير)</span>
                <span>300 متر (مجمع مدرسي متوسط)</span>
                <span>1500 متر (نطاق واسع)</span>
              </div>
            </div>

            {/* Map Preview simulation */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-center space-y-1.5">
              <div className="text-xs text-slate-600 flex items-center justify-center gap-1 font-medium">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
                <span>معاينة الرابط المباشر للموقع على خرائط Google:</span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-900 underline block font-mono font-bold"
              >
                فتح الإحداثيات في خرائط Google ↗
              </a>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>حفظ إعدادات الدوام والسياج</span>
          </button>
        </div>

      </div>
    </div>
  );
};
