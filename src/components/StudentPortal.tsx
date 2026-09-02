import React, { useState, useEffect, useRef } from 'react';
import { User, School, Attendance, CorrectionRequest } from '../types';
import { getAttendances, saveAttendances, getCorrectionRequests, updateUserAvatar, getSystemNotifications } from '../utils/storage';
import { calculateDistance, getCurrentCoordinates } from '../utils/geo';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { compressImageFile } from '../utils/imageCompressor';
import { SubmitExcuseModal } from './SubmitExcuseModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { 
  GraduationCap, MapPin, CheckCircle, Clock, 
  AlertTriangle, Navigation, QrCode, FileEdit, Sparkles, 
  Star, Award, ShieldAlert, HeartHandshake, FileText, 
  Calendar, Check, Plus, AlertCircle, ArrowUpRight, TrendingUp, 
  ThumbsUp, ThumbsDown, Camera, User as UserIcon, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentPortalProps {
  currentUser: User;
  currentSchool: School;
  onOpenQrCard: () => void;
  onOpenCorrection: (attendance: Attendance) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  currentSchool,
  onOpenQrCard,
  onOpenCorrection,
}) => {
  const today = getTodayDateString();
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(getCorrectionRequests());
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string>('');
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [studentAvatar, setStudentAvatar] = useState<string | undefined>(currentUser.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excuse Modal state
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [selectedExcuseDate, setSelectedExcuseDate] = useState<string | undefined>(undefined);

  // Active Tab: 'overview' | 'unexcused' | 'excuses' | 'behavior' | 'actions'
  const [activeTab, setActiveTab] = useState<'overview' | 'unexcused' | 'excuses' | 'behavior' | 'actions'>('overview');

  const studentAttendances = attendances.filter((a) => a.studentId === currentUser.id);
  const todayRecord = studentAttendances.find((a) => a.date === today);
  const studentExcuses = correctionRequests.filter((r) => r.studentId === currentUser.id);

  // Dynamic Behavior Score
  const behaviorSummary = calculateStudentBehaviorScore(currentUser.id);

  const refreshData = () => {
    setAttendances(getAttendances());
    setCorrectionRequests(getCorrectionRequests());
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 400, 0.8);
      setStudentAvatar(compressed);
      updateUserAvatar(currentUser.id, compressed);
      currentUser.avatar = compressed;
      soundManager.playSuccess();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Failed to compress image:', err);
    }
  };

  const handleSelfCheckIn = async () => {
    setIsCheckingIn(true);
    setGeoStatus('جاري التحقق من موقعك الجغرافي بالسياج المدرسي بدقة...');
    try {
      const coords = await getCurrentCoordinates();
      const dist = calculateDistance(
        coords.latitude,
        coords.longitude,
        currentSchool.lat,
        currentSchool.lng
      );
      setDistanceMeters(dist);

      if (dist > currentSchool.radiusMeters) {
        soundManager.playWarning();
        setGeoStatus(`أنت خارج نطاق المدرسة (${dist} متر). يجب التواجد داخل ${currentSchool.radiusMeters} متر.`);
        setIsCheckingIn(false);
        return;
      }

      // Successful check-in inside geofence
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const isLate = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() > 15);

      const allAtt = getAttendances();
      const existingIdx = allAtt.findIndex((a) => a.studentId === currentUser.id && a.date === today);

      let updatedAtt: Attendance;
      if (existingIdx >= 0) {
        allAtt[existingIdx].selfCheckTime = timeStr;
        allAtt[existingIdx].finalStatus = isLate ? 'late' : 'present';
        updatedAtt = allAtt[existingIdx];
      } else {
        updatedAtt = {
          id: `att-${currentUser.id}-${today}`,
          studentId: currentUser.id,
          studentName: currentUser.name,
          nationalId: currentUser.nationalId,
          schoolCode: currentSchool.code,
          className: currentUser.className || 'عام',
          sectionName: currentUser.sectionName || '1',
          date: today,
          selfCheckTime: timeStr,
          teacherMark: null,
          finalStatus: isLate ? 'late' : 'present',
          isTruant: false,
          parentMobile: currentUser.parentMobile,
        };
        allAtt.push(updatedAtt);
      }

      saveAttendances(allAtt);
      setAttendances(allAtt);
      soundManager.playSuccess();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setGeoStatus(`✓ تم تسجيل حضورك بنجاح داخل المدرسة (المسافة: ${dist} متر)!`);
    } catch (err: unknown) {
      const e = err as Error;
      soundManager.playWarning();
      setGeoStatus(e.message || 'فشل تحديد الموقع الجغرافي');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleOpenExcuseForDate = (dateString?: string) => {
    setSelectedExcuseDate(dateString);
    setIsExcuseModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      
      {/* Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* Urgent Broadcast Banner */}
      <BroadcastAlertBanner
        notifications={getSystemNotifications().filter(
          (n) => n.schoolCode === currentSchool.code || !n.schoolCode
        )}
      />

      {/* 1. Header Card with Academic Profile Summary */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xs">
        {/* Profile Card */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Student Photo Avatar with Upload Badge */}
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 overflow-hidden border-2 border-emerald-500 shadow-md flex items-center justify-center text-white">
                {studentAvatar ? (
                  <img src={studentAvatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="تحديث / رفع صورة الطالب الشخصية"
                className="absolute -bottom-1.5 -left-1.5 w-6 h-6 rounded-full bg-slate-900 text-white hover:bg-emerald-600 flex items-center justify-center shadow-md cursor-pointer transition-colors border border-white"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                  الملف الأكاديمي الشامل
                </span>
                <span className="text-xs text-slate-400 font-mono">الهوية: {currentUser.nationalId}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">{currentUser.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                <span>{currentUser.className} - فصل {currentUser.sectionName} | {currentSchool.name}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 underline font-semibold cursor-pointer"
                >
                  {studentAvatar ? 'تغيير الصورة الشخصية' : '+ إضافة صورة شخصية'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenExcuseForDate(undefined)}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 text-xs font-black shadow-md shadow-teal-600/20 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>رفع عذر طبي / غياب 📤</span>
            </button>

            <button
              onClick={onOpenQrCard}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">بطاقتي (QR)</span>
            </button>
          </div>
        </div>

        {/* 2. Dynamic Behavior & Discipline Points Card (100 Base Points) */}
        <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h3 className="font-black text-sm text-slate-100">درجة السلوك والمواظبة الرسمية</h3>
              <span className="text-[10px] text-slate-400 font-normal">(100 درجة بداية العام الدراسي)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${behaviorSummary.rating.badgeColor}`}>
                {behaviorSummary.rating.label}
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {behaviorSummary.currentScore} <span className="text-xs text-slate-400">/ 100</span>
              </span>
            </div>
          </div>

          {/* Points Breakdown Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-bold">الدرجة الأساسية</span>
              <span className="text-base font-black text-slate-200">100</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-rose-350 block font-bold">غياب بدون عذر</span>
              <span className="text-base font-black text-rose-400">
                {behaviorSummary.unexcusedAbsenceCount > 0 ? `-${behaviorSummary.unexcusedAbsenceCount}` : '0'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-amber-300 block font-bold">تأخر صباحي</span>
              <span className="text-base font-black text-amber-400">
                {behaviorSummary.tardinessCount > 0 ? `-${behaviorSummary.tardinessCount}` : '0'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-rose-350 block font-bold">ملاحظات سلوكية</span>
              <span className="text-base font-black text-rose-400">
                {behaviorSummary.negativePoints > 0 ? `-${behaviorSummary.negativePoints}` : '0'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-300 block font-bold">تعزيز سلوك إيجابي</span>
              <span className="text-base font-black text-emerald-400">
                {behaviorSummary.positivePoints > 0 ? `+${behaviorSummary.positivePoints}` : '0'}
              </span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
              <span className="text-[10px] text-indigo-300 block font-bold">فرص تعويضية مستردة</span>
              <span className="text-base font-black text-indigo-400">
                {behaviorSummary.compensatoryPoints > 0 ? `+${behaviorSummary.compensatoryPoints}` : '0'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                behaviorSummary.currentScore >= 90 ? 'bg-emerald-500' :
                behaviorSummary.currentScore >= 80 ? 'bg-teal-500' :
                behaviorSummary.currentScore >= 70 ? 'bg-indigo-500' :
                behaviorSummary.currentScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${behaviorSummary.currentScore}%` }}
            />
          </div>
        </div>

        {/* 3. Today's Attendance Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 font-bold">حالة الحضور اليوم ({today}):</span>
            {todayRecord?.selfCheckTime ? (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>حاضر (وقت البوابة: {todayRecord.selfCheckTime})</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                لم يتم التحضير الذاتي بعد
              </span>
            )}
          </div>

          {/* Self check-in button */}
          {!todayRecord?.selfCheckTime ? (
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSelfCheckIn}
                disabled={isCheckingIn}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Navigation className={`w-5 h-5 ${isCheckingIn ? 'animate-spin' : ''}`} />
                <span>{isCheckingIn ? 'جاري التحقق من السياج...' : 'تحضير ذاتي الآن (وأنا في المدرسة) 📍'}</span>
              </button>
              {geoStatus && (
                <p className="text-xs text-center font-bold text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">{geoStatus}</p>
              )}
            </div>
          ) : (
            <div className="pt-1 flex items-center justify-between text-xs text-emerald-800 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span>🎉 أحسنت! تم تسجيل حضورك بنجاح لليوم الدراسي.</span>
              {todayRecord.exitTime && (
                <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                  🚪 انصراف: {todayRecord.exitTime}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Interactive Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs font-black">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>سجل الحضور اليومي ({studentAttendances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unexcused')}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'unexcused'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>أيام الغياب بدون عذر ({behaviorSummary.unexcusedAbsenceCount})</span>
          {behaviorSummary.unexcusedAbsenceCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
              {behaviorSummary.unexcusedAbsenceCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('excuses')}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'excuses'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الأعذار المرفوعة ومتابعتها ({studentExcuses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('behavior')}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'behavior'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>سجل السلوك والفرص التعويضية ({behaviorSummary.behaviorLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'actions'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>الإنذارات والإجراءات الإدارية ({behaviorSummary.absenceActions.length})</span>
          {behaviorSummary.absenceActions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px]">
              {behaviorSummary.absenceActions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content 1: Overview Attendance */}
      {activeTab === 'overview' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs">
          <h4 className="text-xs font-black text-slate-700">سجل أيام الحضور والغياب:</h4>
          {studentAttendances.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">لا توجد سجلات حضور مسجلة حتى الآن.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {studentAttendances.map((att) => (
                <div
                  key={att.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                      att.finalStatus === 'present' ? 'bg-emerald-100 text-emerald-800' :
                      att.finalStatus === 'late' ? 'bg-amber-100 text-amber-800' :
                      att.excuseStatus === 'accepted' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {att.finalStatus === 'present' ? '✓' : att.finalStatus === 'late' ? '⏱️' : att.excuseStatus === 'accepted' ? '🩺' : '✕'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block font-mono">{att.date}</span>
                      <span className="text-[11px] text-slate-500">
                        وقت البوابة: {att.selfCheckTime || 'لم يسجل'} | الحصة: {att.teacherMark === 'present' ? 'حاضر' : att.teacherMark === 'absent' ? 'غائب' : '--'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${
                      att.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      att.finalStatus === 'late' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      att.excuseStatus === 'accepted' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                      'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {att.finalStatus === 'present' ? 'حاضر' : 
                       att.finalStatus === 'late' ? 'متأخر (-1 درجة)' : 
                       att.excuseStatus === 'accepted' ? 'غائب بعذر مقبول' : 'غائب بدون عذر (-1 درجة)'}
                    </span>

                    {att.finalStatus === 'absent' && att.excuseStatus !== 'accepted' && (
                      <button
                        onClick={() => handleOpenExcuseForDate(att.date)}
                        className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-black cursor-pointer"
                      >
                        رفع عذر 📤
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Unexcused Absence Days List */}
      {activeTab === 'unexcused' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-rose-900">أيام الغياب بدون عذر رسمي:</h4>
              <p className="text-xs text-slate-500">
                كل يوم غياب بدون عذر معتمد يحسم (1 درجة) من درجات المواظبة، يمكنك رفع التقرير الطبي لاستعادة الدرجة فوراً.
              </p>
            </div>
            <button
              onClick={() => handleOpenExcuseForDate(undefined)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تقديم عذر جديد</span>
            </button>
          </div>

          {behaviorSummary.unexcusedAbsenceDays.length === 0 ? (
            <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h5 className="font-black text-emerald-950 text-sm">ممتاز! لا يوجد لديك أي غياب بدون عذر</h5>
              <p className="text-xs text-emerald-700">سجلك منضبط ومثالي، ودرجة مواظبتك كاملة ومحمية.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {behaviorSummary.unexcusedAbsenceDays.map((att) => (
                <div
                  key={att.id}
                  className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-mono text-sm font-black text-rose-950 block">{att.date}</span>
                      <span className="text-xs text-rose-800 font-bold">
                        تم رصد الغياب بالحصة الصفية (-1 درجة مواظبة)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenExcuseForDate(att.date)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>رفع عذر طبي لهذا اليوم (+1 درجة مستعادة)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Excuses & Tracking */}
      {activeTab === 'excuses' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900">الأعذار والتقارير الطبية المرفوعة:</h4>
              <p className="text-xs text-slate-500">متابعة حالة مراجعة الإدارة واعتماد التقارير واستعادة الدرجات المخصومة.</p>
            </div>
            <button
              onClick={() => handleOpenExcuseForDate(undefined)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>عذر جديد</span>
            </button>
          </div>

          {studentExcuses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">لم يتم رفع أي طلب عذر حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {studentExcuses.map((excuse) => (
                <div
                  key={excuse.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-sm">{excuse.date}</span>
                      <span className="text-slate-500">بواسطة: {excuse.requestedByRole === 'parent' ? 'ولي الأمر' : 'الطالب'} ({excuse.requesterName})</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full font-black text-[11px] ${
                      excuse.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      excuse.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}>
                      {excuse.status === 'approved' ? '✓ تم قبول العذر واستعادة الدرجة (+1)' :
                       excuse.status === 'rejected' ? '✕ تم رفض العذر' : '⏳ قيد مراجعة الإدارة'}
                    </span>
                  </div>

                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                    <strong>السبب والمبرر:</strong> {excuse.reason}
                  </p>

                  {excuse.adminDecisionNotes && (
                    <p className="text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 font-bold">
                      <strong>قرار الإدارة والملاحظة:</strong> {excuse.adminDecisionNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: Behavior History & Compensatory Bonuses */}
      {activeTab === 'behavior' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
          <h4 className="text-sm font-black text-slate-900">سجل السلوك والمواظبة والفرص التعويضية:</h4>
          
          {behaviorSummary.behaviorLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">لا توجد ملاحظات سلوكية مرصودة حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {behaviorSummary.behaviorLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    log.type === 'positive' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' :
                    log.type === 'compensatory' ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' :
                    'bg-rose-50/60 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${
                        log.type === 'positive' ? 'bg-emerald-600 text-white' :
                        log.type === 'compensatory' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {log.type === 'positive' ? <ThumbsUp className="w-3.5 h-3.5" /> :
                         log.type === 'compensatory' ? <Award className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <strong className="text-xs font-black block">{log.title}</strong>
                        <span className="text-[10px] text-slate-500">
                          {log.date} | بواسطة: {log.recordedByName} ({log.category})
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl font-black text-xs ${
                      log.type === 'positive' ? 'bg-emerald-600 text-white' :
                      log.type === 'compensatory' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {log.type === 'positive' ? `+${log.points} نقاط تميز` :
                       log.type === 'compensatory' ? `+${log.points} فرصة تعويضية` : `-${log.points} حسم درجات`}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="bg-white/80 p-2 rounded-xl text-[11px] text-slate-700 font-medium">
                      {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 5: Administrative Absence Actions */}
      {activeTab === 'actions' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-900">سجل القرارات والإنذارات الإدارية الرسمية:</h4>
              <p className="text-xs text-slate-500">
                توثيق إجراءات إدارة المدرسة والموجه الطلابي لحالات تكرار الغياب بدون عذر (5 أيام فما فوق).
              </p>
            </div>
          </div>

          {behaviorSummary.absenceActions.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <h5 className="font-black text-slate-900 text-sm">لا توجد أي إنذارات أو إجراءات إدارية</h5>
              <p className="text-xs text-slate-500">سجل الطالب سليم ومنضبط ولم يتجاوز حد تنبيه تكرار الغياب.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {behaviorSummary.absenceActions.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-xs">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-black text-rose-950 block">{act.actionTitle}</strong>
                        <span className="text-[10px] text-slate-500 font-medium">
                          التاريخ: {act.date} | الموثق: {act.recordedByName} ({act.recordedByRole}) | غياب مرصود: {act.absenceCount} أيام
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-black text-[11px] border border-rose-300">
                      إجراء رسمي موثق
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-100 text-slate-800 leading-relaxed">
                    <strong>البيان والقرار: </strong>
                    {act.notes}
                  </div>

                  {act.resetCycle && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <RefreshCw className="w-3 h-3 text-emerald-600" />
                      <span>تمت معالجة الحالة وبدء دورة احتساب جديدة للطالب بعد التعهد الرسمي.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit Excuse Modal */}
      {isExcuseModalOpen && (
        <SubmitExcuseModal
          student={currentUser}
          currentSchool={currentSchool}
          submittedByRole="student"
          requesterName={currentUser.name}
          defaultDate={selectedExcuseDate}
          onClose={() => setIsExcuseModalOpen(false)}
          onSubmitted={() => {
            setIsExcuseModalOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
};
