import React, { useState } from 'react';
import { School, SubscriptionPaymentRequest } from '../types';
import { addPaymentRequest } from '../utils/storage';
import { compressImageFile } from '../utils/fileCompressor';
import { 
  CreditCard, Check, X, Building2, Upload, FileText, 
  Sparkles, ShieldCheck, Heart, AlertCircle, Copy, QrCode, Share2
} from 'lucide-react';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'semester' | 'yearly';
  school?: School;
  onSuccess: () => void;
}

export const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({
  isOpen,
  onClose,
  plan,
  school,
  onSuccess,
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('مصرف الراجحي');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen) return null;

  const price = plan === 'semester' ? 299 : 499;
  const planLabel = plan === 'semester' ? 'اشتراك فصلي (فصل دراسي كامل)' : 'اشتراك سنوي (سنة دراسية كاملة)';
  
  // Real Al Rajhi account details from the owner
  const beneficiaryName = 'انور علي محمد الالمعي';
  const bankName = 'مصرف الراجحي (Al Rajhi Bank)';
  const accountNumber = '282000010006080477155';
  const iban = 'SA9280000282608010477155';
  const formattedIban = 'SA92 8000 0282 6080 1047 7155';

  const handleCopyIban = () => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2500);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2500);
  };

  const handleCopyAll = () => {
    const fullText = `المستفيد: ${beneficiaryName}\nالبنك: ${bankName}\nرقم الحساب: ${accountNumber}\nالآيبان: ${formattedIban}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1000, 0.7);
      setProofImage(compressed);
    } catch {
      // Failed
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !referenceNumber.trim()) return;

    setIsSubmitting(true);
    const req: SubscriptionPaymentRequest = {
      id: `pay-${Date.now()}`,
      schoolCode: school?.code || 'NEW-SCHOOL',
      schoolName: school?.name || 'مدرسة جديدة',
      plan,
      amount: price,
      senderName: senderName.trim(),
      senderBank,
      referenceNumber: referenceNumber.trim(),
      proofImageUrl: proofImage || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addPaymentRequest(req);
    setIsSubmitting(false);
    onSuccess();
    onClose();
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
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">بيانات الدفع والاشتراك المدرسي</h3>
              <p className="text-xs text-slate-500 font-medium">{planLabel} - <strong className="text-emerald-700 font-mono">{price} ريال</strong></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bank transfer info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                🏦
              </div>
              <div>
                <strong className="text-slate-900 font-bold block text-sm">{bankName}</strong>
                <span className="text-[11px] text-slate-500">حساب جاري رسمي للتحويل المباشر</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showQrCode 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{showQrCode ? 'إخفاء الرمز' : 'عرض QR الدفع'}</span>
            </button>
          </div>

          {/* QR Code preview block */}
          {showQrCode && (
            <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 text-center space-y-2 animate-fadeIn">
              <span className="text-xs font-bold text-slate-700 block">رمز الاستجابة السريع (مصرف الراجحي):</span>
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`iban=${iban}&name=${encodeURIComponent(beneficiaryName)}&acc=${accountNumber}`)}`}
                  alt="Al Rajhi QR Code"
                  className="w-full h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">امسح الرمز من تطبيق الراجحي أو البنوك السعودية للتحويل المباشر</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">اسم المستفيد:</span>
              <strong className="text-slate-900 font-black text-sm">{beneficiaryName}</strong>
            </div>

            {/* Account Number */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">رقم الحساب:</span>
                <span className="text-[10px] text-slate-400 font-mono">حساب الراجحي</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={accountNumber}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 font-bold select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                >
                  {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAcc ? 'تم النسخ' : 'نسخ الحساب'}</span>
                </button>
              </div>
            </div>

            {/* IBAN */}
            <div className="pt-2 border-t border-slate-200/80 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">رقم الآيبان البنكي (IBAN):</span>
                <span className="text-[10px] text-emerald-700 font-bold">لجميع البنوك والمحافظ</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={formattedIban}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-emerald-800 font-bold select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyIban}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                >
                  {copiedIban ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIban ? 'تم النسخ' : 'نسخ الآيبان'}</span>
                </button>
              </div>
            </div>

            {/* Share all details button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedAll ? '✓ تم نسخ جميع بيانات الحساب كاملة' : 'نسخ معلومات الحساب كاملة للمشاركة 📋'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Form to submit transfer confirmation */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم المحوّل الثلاثي *</label>
            <input
              type="text"
              required
              placeholder="مثال: صالح محمد السبيعي"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">البنك المحوّل منه *</label>
              <select
                value={senderBank}
                onChange={(e) => setSenderBank(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-medium focus:outline-emerald-500"
              >
                <option value="مصرف الراجحي">مصرف الراجحي</option>
                <option value="البنك الأهلي السعودي">البنك الأهلي السعودي (SNB)</option>
                <option value="بنك الرياض">بنك الرياض</option>
                <option value="مصرف الإنماء">مصرف الإنماء</option>
                <option value="بنك البلاد">بنك البلاد</option>
                <option value="بنك آخر">بنك آخر / محفظة رقمية</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الحوالة / المرجع *</label>
              <input
                type="text"
                required
                placeholder="رقم مرجع الحوالة"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">إرفاق إيصال التحويل (اختياري)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-emerald-600 file:text-white"
            />
            {proofImage && <p className="text-[11px] text-emerald-700 font-bold mt-1">✓ تم تجهيز صورة الإيصال</p>}
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
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إرسال إشعار السداد ↵</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
