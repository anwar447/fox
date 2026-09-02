import React, { useState } from 'react';
import { MapPin, Navigation, Check, X, Compass } from 'lucide-react';
import { getCurrentCoordinates } from '../utils/geo';

interface InteractiveMapPickerProps {
  initialLat: number;
  initialLng: number;
  initialRadius: number;
  onSave: (lat: number, lng: number, radius: number) => void;
  onClose: () => void;
}

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  initialLat,
  initialLng,
  initialRadius,
  onSave,
  onClose,
}) => {
  const [lat, setLat] = useState(initialLat || 24.7136);
  const [lng, setLng] = useState(initialLng || 46.6753);
  const [radius, setRadius] = useState(initialRadius || 300);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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
    onSave(lat, lng, radius);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تحديد موقع وسياج المدرسة الجغرافي</h3>
              <p className="text-xs text-slate-500 font-medium">ضبط إحداثيات البوابة ونصف قطر التحضير</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'جاري تحديد موقعك الحالي...' : 'جلب موقعي الحالي الآن (وأنا بالمدرسة) 📍'}</span>
          </button>
          {statusMsg && (
            <p className="text-[11px] text-emerald-800 text-center font-bold">{statusMsg}</p>
          )}
        </div>

        {/* Coords inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">خط العرض (Latitude):</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">خط الطول (Longitude):</label>
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
            />
          </div>
        </div>

        {/* Radius input */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <label className="text-slate-900 font-bold">نطاق السياج الجغرافي المسموح:</label>
            <span className="font-mono font-bold text-emerald-800 px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-200">{radius} متر</span>
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
            <span>300 متر (مجمع مدرسي)</span>
            <span>1500 متر</span>
          </div>
        </div>

        {/* Map Preview simulation */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center space-y-2">
          <div className="text-xs text-slate-600 flex items-center justify-center gap-1 font-medium">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>معاينة الرابط المباشر على خرائط Google:</span>
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

        <div className="grid grid-cols-2 gap-3 pt-2">
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
            <span>حفظ الإحداثيات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
