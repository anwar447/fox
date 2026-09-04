import React, { useState, useEffect } from 'react';
import { School } from '../types';
import { generateSchoolApiToken } from '../utils/storage';
import { 
  Code2, Copy, Check, RefreshCw, Key, ExternalLink, 
  Terminal, ShieldCheck, Database, Layers, Sparkles, 
  BookOpen, Users, AlertCircle, FileText, ChevronRight,
  Eye, EyeOff, Play, CheckCircle2, ArrowRight
} from 'lucide-react';

interface CounselorApiIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onSchoolUpdated?: () => void;
}

export const CounselorApiIntegrationModal: React.FC<CounselorApiIntegrationModalProps> = ({
  isOpen,
  onClose,
  school,
  onSchoolUpdated,
}) => {
  const [token, setToken] = useState<string>(school.apiToken || `hdrk_${school.code.toLowerCase()}_prod_token`);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'students' | 'attendance' | 'behavior' | 'absenceActions'>('summary');
  const [codeLang, setCodeLang] = useState<'javascript' | 'python' | 'curl'>('javascript');
  
  // Live test state
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (school.apiToken) {
      setToken(school.apiToken);
    }
  }, [school]);

  if (!isOpen) return null;

  const handleGenerateToken = async () => {
    setIsGenerating(true);
    const newToken = await generateSchoolApiToken(school.code);
    setIsGenerating(false);
    if (newToken) {
      setToken(newToken);
      if (onSchoolUpdated) onSchoolUpdated();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const endpoints = {
    summary: {
      title: 'ملخص التوجيه الطلابي والغياب الحرج',
      path: '/api/v1/counselor/summary',
      description: 'يقدم إحصائيات فورية شاملة، وقائمة بأكثر الطلاب غياباً وتأخراً (حالات الخطر) لتسهيل التدخل الإرشادي.',
    },
    students: {
      title: 'قائمة الطلاب وسجلاتهم',
      path: '/api/v1/counselor/students',
      description: 'قائمة بكافة طلاب المدرسة مع فصولهم، أرقام أولياء الأمور، وإجمالي الغياب والتأخر والنقاط السلوكية.',
    },
    attendance: {
      title: 'سجلات الحضور والغياب اليومي والتاريخي',
      path: '/api/v1/counselor/attendance',
      description: 'سجلات الحضور مفصلة باليوم والتاريخ والحالة (غائب، متأخر، مستأذن، حاضر، هروب) مع إمكانية الفلترة.',
    },
    behavior: {
      title: 'الملاحظات والمخالفات السلوكية',
      path: '/api/v1/counselor/behavior',
      description: 'سجلات رصد السلوك الإيجابي والسلبي مع النقاط والملاحظات، ويدعم أيضاً إضافة ملاحظات جديدة عبر POST.',
    },
    absenceActions: {
      title: 'إجراءات التوجيه والإحالات الإدارية',
      path: '/api/v1/counselor/absence-actions',
      description: 'الإجراءات المتخذة حيال الطلاب (تنبيه أول، تعهد ولي أمر، إحالة للموجه الطلابي، لجنة التوجيه الطلابي).',
    },
  };

  const activeEndpoint = endpoints[activeTab];
  const fullUrl = `${baseUrl}${activeEndpoint.path}?apiKey=${token}`;

  const handleTestEndpoint = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(fullUrl);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: 'Failed to fetch API', message: err?.message || String(err) });
    } finally {
      setTestLoading(false);
    }
  };

  const getCodeSnippet = () => {
    if (codeLang === 'javascript') {
      return `// استيراد بيانات الطلاب من منظومة حُضُورَكْ لتطبيق الموجه الطلابي
async function fetchHodoorakData() {
  const url = '${baseUrl}${activeEndpoint.path}';
  const apiToken = '${token}';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${apiToken}\`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('بيانات حُضُورَكْ المستوردة:', data);
  return data;
}

fetchHodoorakData();`;
    }

    if (codeLang === 'python') {
      return `# استيراد بيانات الطلاب لتطبيق الموجه الطلابي باستخدام Python
import requests

url = "${baseUrl}${activeEndpoint.path}"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

print(f"تم استيراد البيانات بنجاح: {data}")`;
    }

    return `# استعلام عبر cURL في الطرفية أو الخادم
curl -X GET "${baseUrl}${activeEndpoint.path}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json"`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-6 shadow-2xl text-slate-800 my-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900">
                  بوابة التكامل والربط البرمجي (API للموجه الطلابي)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-black">
                  v1.0 REST
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ربط مدرسة <strong className="text-slate-800">{school.name} ({school.code})</strong> مع تطبيق الموجه الطلابي والأنظمة الخارجية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            إغلاق ✕
          </button>
        </div>

        {/* API Token Box */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-emerald-50/40 border border-indigo-200/80 rounded-3xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-slate-900">رمز التوكن السري للمدرسة (Secret API Token)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              يُستخدم للمصادقة في ترويسة <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px] font-mono">Authorization: Bearer</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-slate-300/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider overflow-hidden text-ellipsis">
                {showToken ? token : '••••••••••••••••••••••••••••••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title={showToken ? 'إخفاء التوكن' : 'إظهار التوكن'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(token, 'token-main')}
              className={`py-2.5 px-4 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                copiedKey === 'token-main'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copiedKey === 'token-main' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'token-main' ? 'تم النسخ ✓' : 'نسخ التوكن'}</span>
            </button>

            <button
              onClick={handleGenerateToken}
              disabled={isGenerating}
              className="py-2.5 px-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="توليد وتغيير رمز التوكن"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-indigo-600' : ''}`} />
              <span>توليد جديد</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            🔒 احفظ هذا الرمز في تطبيق الموجه الطلابي. لا تشاركه مع أي طرف غير مصرح له.
          </p>
        </div>

        {/* Endpoints Selector Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>نقاط النهاية البرمجية المتاحة (API Endpoints):</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {(Object.keys(endpoints) as (keyof typeof endpoints)[]).map((key) => {
              const ep = endpoints[key];
              const isSelected = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setTestResult(null);
                  }}
                  className={`p-2.5 rounded-2xl border text-right font-bold transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[11px] leading-tight line-clamp-1">{ep.title}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md self-start ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    GET {key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Endpoint Details */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <strong className="text-sm font-black text-slate-900">{activeEndpoint.title}</strong>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-mono text-[10px] font-black">
                GET
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-1">{activeEndpoint.description}</p>
          </div>

          {/* Full Endpoint URL */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">رابط الاستدعاء المباشر (Direct Request URL):</span>
            <div className="bg-white border border-slate-300 rounded-2xl p-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-indigo-700 font-bold overflow-x-auto whitespace-nowrap">
                {fullUrl}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(fullUrl, 'url-active')}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                  title="نسخ الرابط"
                >
                  {copiedKey === 'url-active' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleTestEndpoint}
                  disabled={testLoading}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {testLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>تجربة وجلب البيانات ⚡</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Test Results */}
          {testResult && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نتيجة الاستعلام الحي من السيرفر (JSON Response):</span>
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(testResult, null, 2), 'json-res')}
                  className="text-slate-500 hover:text-slate-800 font-bold text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>نسخ JSON</span>
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-300 p-3.5 rounded-2xl font-mono text-[11px] max-h-52 overflow-y-auto direction-ltr text-left">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}

          {/* Code Integration Examples */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>أكواد جاهزة للنسخ في تطبيق الموجه الطلابي:</span>
              </span>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                {(['javascript', 'python', 'curl'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      codeLang === lang
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] overflow-x-auto direction-ltr text-left">
                {getCodeSnippet()}
              </pre>
              <button
                onClick={() => copyToClipboard(getCodeSnippet(), 'code-snippet')}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedKey === 'code-snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>نسخ الكود</span>
              </button>
            </div>
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs space-y-1.5 text-amber-950">
          <strong className="block font-black text-amber-900">💡 كيف يستورد تطبيق الموجه الطلابي البيانات بانتظام؟</strong>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90">
            <li>قم بتمرير رابط <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">/api/v1/counselor/summary</code> لتطبيق الموجه الطلابي مع التوكن أعلاه.</li>
            <li>يمكن لبرنامج الموجه عمل جدولة آلية (Cron Job / Polling) كل صباح لجلب حالات الغياب الجديدة والمخالفات السلوكية فور رصدها في حُضُورَكْ.</li>
            <li>يمكن لبرنامج الموجه أيضاً إرسال ملاحظات وإجراءات التوجيه الطلابي عبر <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">POST /api/v1/counselor/behavior</code> لتوثيقها تلقائياً.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
