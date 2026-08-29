import React, { useState, useEffect, useRef } from 'react';
import { User, School, Attendance, Excuse, Emergency } from '../types';
import { formatReadableClass, getHijriDateInfo, getTodayDateString } from '../utils/academic';
import { triggerNotification } from '../utils/notifications';
import { getGpsSimulationState, setGpsSimulationState, calculateStudentBehaviorScore } from '../utils/storage';
import { processAndCompressFile, ProcessedFile } from '../utils/fileCompressor';
import { StudentDossierModal } from './StudentDossierModal';
import confetti from 'canvas-confetti';
import { 
  MapPin, CheckCircle2, Clock, Calendar, FileText, AlertTriangle, 
  Upload, ShieldCheck, X, Camera, QrCode, Sparkles, Navigation, 
  Award, Send, UserCheck, Paperclip, FileUp, Eye, ShieldAlert, HeartHandshake
} from 'lucide-react';

interface StudentPortalProps {
  currentUser: User;
  school: School;
  attendances: Attendance[];
  excuses: Excuse[];
  emergencies: Emergency[];
  onCheckIn: (timeHHMMSS: string) => void;
  onSubmitExcuse: (excuse: Omit<Excuse, 'id' | 'submittedAt'>) => void;
  onRespondEmergency: (emergencyId: string, status: 'safe' | 'needs_help' | 'acknowledged', note?: string) => void;
  onUpdatePhoto?: (photoUrl: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  school,
  attendances,
  excuses,
  emergencies,
  onCheckIn,
  onSubmitExcuse,
  onRespondEmergency,
  onUpdatePhoto,
}) => {
  const [gpsSimMode, setGpsSimMode] = useState<'inside' | 'outside' | 'real_gps'>(getGpsSimulationState());
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [selectedAbsenceDate, setSelectedAbsenceDate] = useState(getTodayDateString());
  const [excuseType, setExcuseType] = useState<'medical' | 'family' | 'other'>('medical');
  const [excuseDesc, setExcuseDesc] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [excuseFile, setExcuseFile] = useState<ProcessedFile | null>(null);
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>(
    currentUser.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excuseFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('ar-SA', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayDateString();
  const dateInfo = getHijriDateInfo(new Date());

  // Today's attendance record
  const todayRecord = attendances.find(
    (a) => (a.studentId === currentUser.id || a.nationalId === currentUser.nationalId) && a.date === todayStr
  );

  const isInside = gpsSimMode === 'inside';

  const handleSelfCheckIn = () => {
    if (!isInside) {
      alert('أنت خارج نطاق الحرم المدرسي! يرجى التواجد داخل المدرسة أو تفعيل محاكي الموقع.');
      return;
    }

    if (todayRecord?.selfCheckTime) {
      alert('لقد قمت بتسجيل حضورك اليوم مسبقاً بنجاح.');
      return;
    }

    const time = new Date().toLocaleTimeString('ar-SA', { hour12: false });
    onCheckIn(time);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    triggerNotification(
      'تم تسجيل حضورك بنجاح!',
      `تم التحضير الذاتي بنجاح داخل النطاق الجغرافي لمدرسة ${school.name} في تمام الساعة ${time}`,
      'attendance',
      school.code,
      'student'
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const processed = await processAndCompressFile(e.target.files[0]);
        setPhotoPreview(processed.dataUrl);
        if (onUpdatePhoto) {
          onUpdatePhoto(processed.dataUrl);
        }
        setIsPhotoModalOpen(false);
        triggerNotification('تم تحديث صورتك الشخصية', 'ستظهر صورتك الآن في بطاقتك ولوحة تحضير المعلم والإدارة المدرسية.', 'general');
      } catch (err) {
        alert('حدث خطأ أثناء معالجة الصورة');
      }
    }
  };

  const handleExcuseFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsCompressingFile(true);
      try {
        const processed = await processAndCompressFile(e.target.files[0]);
        setExcuseFile(processed);
      } catch (err) {
        alert('حدث خطأ أثناء معالجة الملف المرفوع');
      } finally {
        setIsCompressingFile(false);
      }
    }
  };

  const handleSubmitExcuseForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseDesc.trim()) return;

    onSubmitExcuse({
      studentId: currentUser.id,
      studentName: currentUser.name,
      nationalId: currentUser.nationalId,
      schoolCode: school.code,
      className: currentUser.className || 'الأول المتوسط',
      sectionName: currentUser.sectionName || '1',
      date: selectedAbsenceDate,
      type: excuseType,
      description: excuseDesc,
      file: excuseFile?.dataUrl,
      fileName: excuseFile?.name,
      fileType: excuseFile?.type,
      parentNote: parentNote || undefined,
      status: 'pending',
    });

    setIsExcuseModalOpen(false);
    setExcuseDesc('');
    setExcuseFile(null);
    setParentNote('');

    triggerNotification(
      'تم إرسال العذر لإدارة المدرسة',
      `تم إرسال طلب تبرير غياب يوم ${selectedAbsenceDate}، بانتظار مراجعة الوكيل المعتمد.`,
      'excuse',
      school.code,
      'student'
    );
  };

  const readableClass = formatReadableClass(currentUser.className, currentUser.sectionName);

  const activeEmergencies = emergencies.filter(
    (e) => (e.schoolCode === school.code || e.schoolCode === 'RAYA-1448') && e.active
  );

  // Student Behavior Score (100 base - 1/late day - manual deductions)
  const behaviorStats = calculateStudentBehaviorScore(
    currentUser.id,
    currentUser.nationalId,
    school.code
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-16 text-slate-800" dir="rtl">
      
      {/* Top Banner & Welcome with Student Digital Profile */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4 border border-emerald-500/20">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            {/* Student Photo with Upload Trigger */}
            <div className="relative group">
              <img
                src={photoPreview}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg bg-slate-800"
              />
              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute -bottom-1 -left-1 p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
                title="تحديث أو رفع صورة شخصية"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>طالب نظامي - {school.name}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                <span>الصف: <strong className="text-emerald-300 font-bold">{readableClass}</strong></span>
                <span>•</span>
                <span>رقم الطالب / الهوية: <strong className="font-mono text-slate-200">{currentUser.nationalId}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDossierModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>ملفي الأكاديمي الشامل</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[120px]">
              <span className="text-[10px] text-emerald-300 block">{dateInfo.dayName}</span>
              <strong className="text-sm font-black text-white block">{dateInfo.hijri}</strong>
              <span className="text-[10px] text-slate-300 font-mono">{currentTimeStr}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Active Emergencies Alerts */}
      {activeEmergencies.map((emg) => (
        <div
          key={emg.id}
          className="p-4 sm:p-5 rounded-3xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md space-y-3 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900">
                  تنبيه وبث طوارئ مدرسي عاجل
                </span>
                <p className="text-xs sm:text-sm font-bold text-rose-900 mt-1 leading-relaxed">
                  {emg.message}
                </p>
              </div>
            </div>
          </div>

          {/* User specifically requested replacing "تأكيد سلامتي انا بخير" with "لقد استملت التنبيه شكرا" */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-rose-200">
            <button
              onClick={() => onRespondEmergency(emg.id, 'safe', 'تم استلام التنبيه')}
              className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors cursor-pointer shadow-sm"
            >
              لقد استلمت التنبيه، شكراً ✓
            </button>
            <button
              onClick={() => onRespondEmergency(emg.id, 'needs_help', 'بحاجة إلى مساعدة')}
              className="px-4 py-2 rounded-xl bg-rose-700 text-white font-bold text-xs hover:bg-rose-800 transition-colors cursor-pointer"
            >
              ⚠ أحتاج مساعدة فورية
            </button>
          </div>
        </div>
      ))}

      {/* Main Check-in Radar Card (السياج الجغرافي والتحضير الذاتي) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        
        {/* Header & Geofence Mode Simulator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>تسجيل الحضور الذاتي بالسياج الجغرافي</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يتطلب التواجد الفعلي داخل حرم مدرسة {school.name} بنطاق ({school.geofence.radius} متر)
            </p>
          </div>

          {/* Simulator Bar */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
            <span className="text-slate-500 px-2">محاكي الموقع:</span>
            <button
              type="button"
              onClick={() => { setGpsSimMode('inside'); setGpsSimulationState('inside'); }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                gpsSimMode === 'inside'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              داخل المدرسة (متاح)
            </button>
            <button
              type="button"
              onClick={() => { setGpsSimMode('outside'); setGpsSimulationState('outside'); }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                gpsSimMode === 'outside'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              خارج المدرسة (معطل)
            </button>
          </div>
        </div>

        {/* Radar & Check-in Action Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-5 relative overflow-hidden">
          
          {/* Geofence Status Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isInside ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <span className="text-xs font-black">
              {isInside ? (
                <span className="text-emerald-700 font-bold">أنت متواجد الآن داخل النطاق الجغرافي للمدرسة ✓</span>
              ) : (
                <span className="text-rose-700 font-bold">أنت خارج النطاق الجغرافي لمبنى المدرسة (يرجى الاقتراب للتسجيل)</span>
              )}
            </span>
          </div>

          {/* Action Check In Button */}
          {todayRecord?.selfCheckTime ? (
            <div className="space-y-2">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-sm font-black text-emerald-800">
                تم تسجيل حضورك اليوم بنجاح في تمام الساعة: <span className="font-mono text-base">{todayRecord.selfCheckTime}</span>
              </div>
              <p className="text-xs text-slate-500">تم اعتماد بصمتك الجغرافية ومطابقتها مع كشف الفصل الدراسي.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSelfCheckIn}
              disabled={!isInside}
              className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 transition-all transform active:scale-95 shadow-lg ${
                isInside
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-emerald-500/25'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Navigation className="w-5 h-5" />
              <span>تسجيل الحضور الذاتي الآن (بصمة الجوال)</span>
            </button>
          )}

        </div>

      </div>

      {/* Student Behavior & Discipline Score Card (100 Points System) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-500/20 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${
              behaviorStats.currentScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              behaviorStats.currentScore >= 80 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">بطاقة درجات السلوك والمواظبة للفصل الدراسي</h3>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  behaviorStats.currentScore >= 90 ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' :
                  behaviorStats.currentScore >= 80 ? 'bg-amber-500/30 text-amber-300 border border-amber-400/30' :
                  'bg-rose-500/30 text-rose-300 border border-rose-400/30'
                }`}>
                  {behaviorStats.currentScore >= 95 ? 'سلوك متميز ومثالي' :
                   behaviorStats.currentScore >= 90 ? 'سلوك ممتاز' :
                   behaviorStats.currentScore >= 80 ? 'سلوك جيد جداً' :
                   behaviorStats.currentScore >= 70 ? 'سلوك جيد' : 'يحتاج متابعة وتعديل سلوك'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تبدأ بـ 100 درجة كاملة كل فصل دراسي، ويُحسم (1 درجة) عن كل يوم تأخر صباحي بالإضافة للمخالفات الإدارية المعتمدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl border border-white/15 self-start sm:self-auto backdrop-blur-md">
            <div>
              <span className="text-[11px] text-slate-300 block">رصيد درجاتك الحالي:</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${
                  behaviorStats.currentScore >= 90 ? 'text-emerald-400' :
                  behaviorStats.currentScore >= 80 ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {behaviorStats.currentScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100 درجة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-xs font-bold block">الدرجة الأساسية للفصل:</span>
            <span className="text-xl font-black text-white">100 درجة</span>
            <span className="text-[10px] text-emerald-400 block font-medium">رصيد معتمد بداية كل فصل</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-xs font-bold block">حسم التأخر الصباحي ({behaviorStats.tardinessDeductions} يوم):</span>
            <span className="text-xl font-black text-amber-400">-{behaviorStats.tardinessDeductions} درجة</span>
            <span className="text-[10px] text-amber-300/80 block font-medium">حسم 1 درجة تلقائياً عن كل تأخر</span>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-1">
            <span className="text-slate-400 text-xs font-bold block">حسومات المخالفات الإدارية:</span>
            <span className="text-xl font-black text-rose-400">-{behaviorStats.manualDeductionsTotal} درجة</span>
            <span className="text-[10px] text-rose-300/80 block font-medium">({behaviorStats.manualDeductionsList.length}) قرارات معتمدة من الإدارة</span>
          </div>
        </div>

        {/* Detailed Deductions List if any */}
        {behaviorStats.manualDeductionsList.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <h4 className="text-xs font-bold text-slate-200">سجل المخالفات المعتمدة وخصم السلوك:</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {behaviorStats.manualDeductionsList.map((ded) => (
                <div key={ded.id} className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-rose-300 font-bold text-sm">{ded.reason}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">({ded.date})</span>
                    </div>
                    {ded.notes && <p className="text-slate-300 text-xs leading-relaxed">{ded.notes}</p>}
                    <span className="text-[10px] text-slate-400 block">المعتمد: {ded.recordedByName}</span>
                  </div>
                  <span className="bg-rose-600/90 text-white font-mono font-bold px-3 py-1 rounded-xl text-xs shrink-0 self-start sm:self-auto">
                    حسم {ded.points} درجات
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Past Excuses & Submit Excuse Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">الأعذار الطبية والرسمية المقدمة</h3>
          </div>

          <button
            onClick={() => setIsExcuseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileUp className="w-4 h-4" />
            <span>تقديم عذر غياب جديد</span>
          </button>
        </div>

        {excuses.filter((e) => e.studentId === currentUser.id || e.nationalId === currentUser.nationalId).length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-500 font-bold">لم تقم بتقديم أي أعذار غياب سابقة</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
            {excuses
              .filter((e) => e.studentId === currentUser.id || e.nationalId === currentUser.nationalId)
              .map((exc) => (
                <div key={exc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">تاريخ الغياب: {exc.date}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        exc.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exc.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {exc.status === 'approved' ? '✓ تم قبول العذر واعتماده' : exc.status === 'rejected' ? '✗ تم رفض العذر' : '⏳ قيد مراجعة الإدارة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{exc.description}</p>
                    {exc.rejectionReason && (
                      <p className="text-[11px] font-bold text-rose-600">سبب الرفض: {exc.rejectionReason}</p>
                    )}
                  </div>

                  {exc.fileName && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      {exc.fileName}
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">تحديث الصورة الشخصية للطالب</h3>
              <button onClick={() => setIsPhotoModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>رفع صورة من الجهاز أو الكاميرا</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Excuse Modal with PDF / Image Upload */}
      {isExcuseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">تقديم عذر غياب رسمي (تقرير طبي أو PDF)</h3>
              <button onClick={() => setIsExcuseModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExcuseForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">تاريخ يوم الغياب</label>
                <input
                  type="date"
                  value={selectedAbsenceDate}
                  onChange={(e) => setSelectedAbsenceDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">نوع العذر</label>
                <select
                  value={excuseType}
                  onChange={(e) => setExcuseType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold"
                >
                  <option value="medical">إجازة مرضية معتمدة (منصة صحتي)</option>
                  <option value="family">ظرف عائلي طارئ</option>
                  <option value="other">أسباب أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">تفاصيل وسبب الغياب</label>
                <textarea
                  rows={3}
                  value={excuseDesc}
                  onChange={(e) => setExcuseDesc(e.target.value)}
                  placeholder="اكتب توضيحاً موجزاً لسبب الغياب..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              {/* Upload Document / PDF / Image with Automatic Compression */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">إرفاق تقرير طبي أو مستند (PDF أو صورة)</label>
                <input
                  type="file"
                  ref={excuseFileInputRef}
                  accept=".pdf, image/*"
                  onChange={handleExcuseFileUpload}
                  className="hidden"
                />

                <div
                  onClick={() => excuseFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-colors"
                >
                  {isCompressingFile ? (
                    <span className="text-emerald-700 font-bold">جاري ضغط ومعالجة المستند...</span>
                  ) : excuseFile ? (
                    <div className="flex items-center justify-between text-emerald-800 bg-emerald-100/80 p-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        <span className="font-bold font-mono">{excuseFile.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">({excuseFile.compressedSizeKb} KB) ✓ تم الضغط</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <span className="text-xs font-bold text-slate-700 block">انقر لرفع ملف PDF أو صورة التقرير الطبي</span>
                      <span className="text-[10px] text-slate-400 block">يتم ضغط وتصغير حجم الملف تلقائياً لتسريع الإرسال</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">ملاحظة ولي الأمر (اختياري)</label>
                <input
                  type="text"
                  placeholder="موافقة أو تعليق ولي الأمر..."
                  value={parentNote}
                  onChange={(e) => setParentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExcuseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  إرسال العذر للإدارة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Dossier Modal */}
      <StudentDossierModal
        student={currentUser}
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        school={school}
        allAttendances={attendances}
        allExcuses={excuses}
      />

    </div>
  );
};
