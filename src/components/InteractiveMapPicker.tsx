import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, ZoomIn, ZoomOut, Search, Check, Layers, AlertCircle, RefreshCw, Crosshair } from 'lucide-react';

interface InteractiveMapPickerProps {
  latitude: number;
  longitude: number;
  radius: number;
  onChange: (coords: { lat: number; lng: number; address?: string }) => void;
  height?: string;
}

const SAUDI_CITIES_COORDS: Record<string, { lat: number; lng: number }> = {
  'الرياض': { lat: 24.7136, lng: 46.6753 },
  'جدة': { lat: 21.5433, lng: 39.1728 },
  'مكة المكرمة': { lat: 21.4225, lng: 39.8262 },
  'المدينة المنورة': { lat: 24.4672, lng: 39.6111 },
  'الدمام': { lat: 26.4344, lng: 50.1033 },
  'الخبر': { lat: 26.2818, lng: 50.2084 },
  'الظهران': { lat: 26.2361, lng: 50.0393 },
  'الأحساء - الهفوف': { lat: 25.3647, lng: 49.5857 },
  'القصيم - بريدة': { lat: 26.3592, lng: 43.9818 },
  'عنيزة': { lat: 26.0858, lng: 43.9936 },
  'حائل': { lat: 27.5236, lng: 41.6966 },
  'تبوك': { lat: 28.3835, lng: 36.5662 },
  'أبها': { lat: 18.2164, lng: 42.5053 },
  'خميس مشيط': { lat: 18.3000, lng: 42.7333 },
  'جازان': { lat: 16.8892, lng: 42.5706 },
  'نجران': { lat: 17.5656, lng: 44.2289 },
  'الطائف': { lat: 21.2841, lng: 40.4248 },
  'ينبع': { lat: 24.0895, lng: 38.0637 },
  'الجبيل': { lat: 27.0046, lng: 49.6601 },
  'حفر الباطن': { lat: 28.4328, lng: 45.9708 },
  'عرعر': { lat: 30.9753, lng: 41.0381 },
  'سكاكا': { lat: 29.9697, lng: 40.2064 },
};

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  latitude,
  longitude,
  radius,
  onChange,
  height = '340px',
}) => {
  const [zoom, setZoom] = useState(16);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert lat/lng to tile numbers
  const latRad = (latitude * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xCenter = ((longitude + 180) / 360) * n;
  const yCenter = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  // Pre-calculate 3x3 grid tiles around the center
  const baseTileX = Math.floor(xCenter);
  const baseTileY = Math.floor(yCenter);
  const fracX = (xCenter - baseTileX) * 256;
  const fracY = (yCenter - baseTileY) * 256;

  // Handle GPS Auto-detect
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChange({ lat, lng, address: 'موقعي الحالي (GPS)' });
        setZoom(17);
      },
      (err) => {
        setIsLocating(false);
        setGeoError('يرجى السماح بصلاحية الموقع من إعدادات المتصفح');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle City search
  const handleSearchSelect = (cityName: string) => {
    const coords = SAUDI_CITIES_COORDS[cityName];
    if (coords) {
      onChange({ lat: coords.lat, lng: coords.lng, address: cityName });
      setSearchQuery('');
      setZoom(16);
    }
  };

  // Handle Drag / Pan Map
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      lat: latitude,
      lng: longitude,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: 0, y: 0 });

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      // Calculate new center
      const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
      const newLat = Number((dragStartRef.current.lat + (dy * metersPerPixel) / 111320).toFixed(6));
      const newLng = Number((dragStartRef.current.lng - (dx * metersPerPixel) / (111320 * Math.cos(latRad))).toFixed(6));
      onChange({ lat: newLat, lng: newLng });
    }
  };

  // Click on map to place pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const deltaX = clickX - centerX;
    const deltaY = clickY - centerY;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      const metersPerPixel = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
      const newLat = Number((latitude - (deltaY * metersPerPixel) / 111320).toFixed(6));
      const newLng = Number((longitude + (deltaX * metersPerPixel) / (111320 * Math.cos(latRad))).toFixed(6));
      onChange({ lat: newLat, lng: newLng });
    }
  };

  // Filter city suggestions
  const filteredCities = Object.keys(SAUDI_CITIES_COORDS).filter((c) =>
    c.includes(searchQuery.trim())
  );

  // Generate 5x5 grid of tile URLs
  const tiles = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = baseTileX + dx;
      const ty = baseTileY + dy;
      const key = `${zoom}-${tx}-${ty}`;
      
      const url =
        mapType === 'satellite'
          ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
          : `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

      tiles.push({
        key,
        dx,
        dy,
        url,
      });
    }
  }

  return (
    <div className="space-y-3 font-sans" dir="rtl">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مدينة أو حي سريعاً (الرياض، جدة، مكة...)"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden font-bold"
          />
          {searchQuery.trim() && filteredCities.length > 0 && (
            <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto py-1">
              {filteredCities.map((cityName) => (
                <button
                  key={cityName}
                  type="button"
                  onClick={() => handleSearchSelect(cityName)}
                  className="w-full text-right px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between"
                >
                  <span>{cityName}</span>
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="تحديد موقعي الحالي بدقة GPS"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'جاري التحديد...' : 'موقعي الحالي (GPS)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200"
            title="تبديل الخريطة بين شوارع وقمر صناعي"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{mapType === 'streets' ? 'قمر صناعي 🛰️' : 'شوارع 🗺️'}</span>
          </button>
        </div>
      </div>

      {geoError && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Real Interactive Tile Map Canvas */}
      <div
        ref={containerRef}
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleMapClick}
        className="relative w-full rounded-2xl overflow-hidden border-2 border-emerald-500/80 shadow-md bg-slate-200 cursor-grab active:cursor-grabbing select-none group touch-none"
      >
        {/* Tiles Grid Layer */}
        <div
          className="absolute inset-0 transition-transform duration-75 pointer-events-none"
          style={{
            transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          }}
        >
          {tiles.map((tile) => {
            const left = `calc(50% + ${tile.dx * 256 - fracX}px)`;
            const top = `calc(50% + ${tile.dy * 256 - fracY}px)`;
            return (
              <img
                key={tile.key}
                src={tile.url}
                alt="map tile"
                loading="eager"
                crossOrigin="anonymous"
                className="absolute w-[256px] h-[256px] object-cover pointer-events-none select-none max-w-none"
                style={{
                  left,
                  top,
                }}
                onError={(e) => {
                  // Fallback tile on network drop
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://tile.openstreetmap.org/0/0/0.png';
                }}
              />
            );
          })}
        </div>

        {/* Center Geofence Radius Circle */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            style={{
              width: `${Math.min(260, Math.max(60, radius * 0.35))}px`,
              height: `${Math.min(260, Math.max(60, radius * 0.35))}px`,
            }}
            className="rounded-full border-2 border-dashed border-emerald-500 bg-emerald-500/20 animate-pulse flex items-center justify-center"
          >
            <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shadow-xs">
              نطاق التحضير: {radius} متر
            </span>
          </div>

          {/* Interactive Red Drop Pin in Center */}
          <div className="absolute flex flex-col items-center -translate-y-7 pointer-events-none">
            <div className="relative">
              <MapPin className="w-10 h-10 text-rose-600 fill-rose-500 drop-shadow-xl filter" />
              <div className="w-3 h-3 bg-white rounded-full absolute top-2 left-1/2 -translate-x-1/2 shadow-xs" />
            </div>
            <div className="w-4 h-2 bg-black/40 rounded-full blur-[2px] -mt-1" />
          </div>
        </div>

        {/* Floating Zoom & Recenter Controls */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setZoom(Math.min(19, zoom + 1))}
            className="w-8 h-8 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-md flex items-center justify-center font-bold text-sm border border-slate-200 cursor-pointer"
            title="تكبير الخريطة"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(Math.max(10, zoom - 1))}
            className="w-8 h-8 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-md flex items-center justify-center font-bold text-sm border border-slate-200 cursor-pointer"
            title="تصغير الخريطة"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center justify-center font-bold text-sm border border-emerald-500 cursor-pointer"
            title="موقعي الحالي"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Tip & Coordinates Bar */}
        <div className="absolute bottom-2 right-2 left-2 z-20 pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur-xs text-white text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-between shadow-lg border border-white/10">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>اسحب الخريطة أو اضغط في أي مكان لتحديد موقع المدرسة 📍</span>
            </span>
            <span className="font-mono text-emerald-300 text-[10px] dir-ltr">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>
        </div>
      </div>

      {/* Manual Coordinates */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-500 font-bold ml-1">خط العرض:</span>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => onChange({ lat: parseFloat(e.target.value) || 24.7136, lng: longitude })}
              className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-slate-900 font-mono font-bold w-24 text-center text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold ml-1">خط الطول:</span>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => onChange({ lat: latitude, lng: parseFloat(e.target.value) || 46.6753 })}
              className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-slate-900 font-mono font-bold w-24 text-center text-xs"
            />
          </div>
        </div>
        <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          <span>الموقع معتمد للسياج الجغرافي</span>
        </div>
      </div>
    </div>
  );
};
