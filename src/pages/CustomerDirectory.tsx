import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import {
  MessageCircle, Trash2, X, Send, Loader2, Users,
  Gift, Star, Sparkles, Download, Upload, FileText, AlertTriangle
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const LS_KEY      = 'has_seen_customer_list_reward';
const REWARD_DAYS = 5;

// Sample CSV content for download
const SAMPLE_CSV_CONTENT = `Name,Phone,Address
রহিম উদ্দিন,01711000001,ঢাকা - মিরপুর ১০
করিম সাহেব,01811000002,চট্টগ্রাম - আগ্রাবাদ
সুমাইয়া বেগম,01911000003,সিলেট - জিন্দাবাজার`;

// ── Reward Popup ───────────────────────────────────────────────────────────────
function RewardPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ animation: 'rewardPopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <style>{`
          @keyframes rewardPopIn {
            from { opacity:0; transform:scale(0.7) translateY(30px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
          }
          @keyframes floatStar {
            0%,100% { transform:translateY(0) rotate(0deg); }
            50%     { transform:translateY(-8px) rotate(15deg); }
          }
        `}</style>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-1.5 transition">
          <X size={18} />
        </button>
        <div className="relative px-6 pt-8 pb-6 text-white text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#7C3AED 0%,#4F46E5 50%,#0F6E56 100%)' }}>
          <div className="absolute top-4 left-6 text-yellow-300 text-xl opacity-80" style={{ animation: 'floatStar 3s ease-in-out infinite' }}>⭐</div>
          <div className="absolute top-8 right-8 text-yellow-300 text-sm opacity-60" style={{ animation: 'floatStar 2.5s ease-in-out infinite 0.5s' }}>✨</div>
          <div className="relative z-10 mx-auto mb-3 w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/20">
            <Gift className="w-8 h-8 text-yellow-300" />
          </div>
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">🎉 অভিনন্দন!</p>
            <h2 className="text-2xl font-extrabold leading-tight mb-1">+{REWARD_DAYS} দিন ফ্রি</h2>
            <p className="text-white/90 text-sm font-medium">আনলক হয়েছে আপনার একাউন্টে!</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Star className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 font-medium leading-relaxed">
              প্রথমবার <span className="font-extrabold text-purple-600">Bulk SMS</span> পাঠানো সম্পন্ন করেছেন।
              সাবস্ক্রিপশনে <span className="font-extrabold text-[#0F6E56]">{REWARD_DAYS} দিন বোনাস</span> যোগ হয়েছে!
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>এই পুরস্কার শুধুমাত্র একবার দেওয়া হয়</span>
          </div>
          <button onClick={onClose} className="w-full py-3.5 rounded-xl font-extrabold text-white transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            দারুণ! ধন্যবাদ 🎉
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import CSV Modal ───────────────────────────────────────────────────────────
interface ImportResult { inserted: number; duplicates: number; errors: number; }

function ImportCsvModal({
  onClose,
  onImportDone,
  shopId,
}: {
  onClose: () => void;
  onImportDone: () => void;
  shopId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // Download sample CSV
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'sample_customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setPreviewRows([]);
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setPreviewRows(res.data.slice(0, 5) as any[]);
      },
    });
  };

  const handleImport = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('প্রথমে একটি CSV ফাইল বেছে নিন।'); return; }

    setIsProcessing(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data as Record<string, string>[];

        // Normalize column names (case-insensitive)
        const normalize = (row: Record<string, string>) => {
          const keys = Object.keys(row);
          const find = (candidates: string[]) =>
            keys.find(k => candidates.includes(k.toLowerCase().trim())) ?? '';
          return {
            name:    row[find(['name', 'নাম'])]?.trim()  || 'Unknown',
            phone:   row[find(['phone', 'ফোন', 'mobile', 'number'])]?.trim() || '',
            address: row[find(['address', 'ঠিকানা', 'addr'])]?.trim() || '',
          };
        };

        const validRows = rows.map(normalize).filter(r => r.phone.length >= 10);

        if (validRows.length === 0) {
          toast.error('ফাইলে কোনো বৈধ ফোন নম্বর পাওয়া যায়নি। নমুনা CSV দেখুন।');
          setIsProcessing(false);
          return;
        }

        let inserted = 0, duplicates = 0, errors = 0;

        // Batch in chunks of 50 to avoid payload limits
        const CHUNK = 50;
        for (let i = 0; i < validRows.length; i += CHUNK) {
          const chunk = validRows.slice(i, i + CHUNK).map(r => ({
            shop_id:      shopId,
            name:         r.name,
            phone:        r.phone,
            address:      r.address,
            is_deleted:   false,
            total_orders: 0,
            total_spent:  0,
          }));

          // onConflict: phone is the unique key per shop
          // We use ignoreDuplicates: true via upsert with MergeColumns approach
          const { data, error } = await supabase
            .from('customers')
            .upsert(chunk, {
              onConflict: 'shop_id,phone',  // ← per-shop unique: same phone in diff shops is OK
              ignoreDuplicates: true,
            })
            .select('id');

          if (error) {
            console.error('[CSV IMPORT] Chunk error:', error.message);
            errors += chunk.length;
          } else {
            const newlyInserted = data?.length ?? 0;
            inserted   += newlyInserted;
            duplicates += chunk.length - newlyInserted;
          }
        }

        setResult({ inserted, duplicates, errors });
        setIsProcessing(false);
        if (inserted > 0) onImportDone(); // refresh parent list
      },
      error: (err) => {
        toast.error('CSV পার্স করতে ত্রুটি: ' + err.message);
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-6 text-white rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition">
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-white/20 p-2 rounded-xl"><Upload className="w-6 h-6" /></div>
            <h2 className="text-xl font-extrabold">CSV থেকে কাস্টমার Import</h2>
          </div>
          <p className="text-white/80 text-sm font-medium">Name, Phone, Address কলাম সহ CSV ফাইল আপলোড করুন</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Sample download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-bold text-gray-800">নমুনা CSV ফাইল</p>
                <p className="text-xs text-gray-500">সঠিক ফরম্যাট দেখুন ও ডাউনলোড করুন</p>
              </div>
            </div>
            <button
              onClick={downloadSample}
              className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition"
            >
              <Download className="w-4 h-4" /> নমুনা ডাউনলোড
            </button>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">CSV ফাইল বেছে নিন</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-600 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#0F6E56] focus:border-[#0F6E56] transition file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#0F6E56]/10 file:text-[#0F6E56] hover:file:bg-[#0F6E56]/20"
            />
          </div>

          {/* Preview table */}
          {previewRows.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">প্রিভিউ (প্রথম ৫ সারি)</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs font-en">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>{Object.keys(previewRows[0]).map(k => (
                      <th key={k} className="px-3 py-2 font-medium text-left">{k}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        {Object.values(row as Record<string, string>).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Duplicate warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>একই ফোন নম্বরের কাস্টমার থাকলে সেটি স্বয়ংক্রিয়ভাবে বাদ দেওয়া হবে (ডুপ্লিকেট insert হবে না)।</span>
          </div>

          {/* Result banner */}
          {result && (
            <div className={`rounded-xl px-4 py-3 border text-sm font-medium space-y-1 ${result.errors > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
              <p className="font-extrabold">Import সম্পন্ন!</p>
              <p>✅ নতুন যোগ হয়েছে: <span className="font-bold">{result.inserted} জন</span></p>
              <p>⏩ ডুপ্লিকেট skip: <span className="font-bold">{result.duplicates} জন</span></p>
              {result.errors > 0 && <p>❌ ত্রুটি: <span className="font-bold">{result.errors} টি</span></p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition">
              {result ? 'বন্ধ করুন' : 'বাতিল'}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-bold hover:bg-[#1D9E75] transition shadow-lg shadow-[#0F6E56]/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Import হচ্ছে...</>
                  : <><Upload className="w-4 h-4" /> Import শুরু করুন</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CustomerDirectory() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modals
  const [showSmsModal,    setShowSmsModal]    = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);

  // SMS
  const [smsMessage, setSmsMessage] = useState('');
  const [isSending,  setIsSending]  = useState(false);

  // Dual Scrollbar refs
  const topScrollRef     = React.useRef<HTMLDivElement>(null);
  const tableScrollRef   = React.useRef<HTMLDivElement>(null);
  const tableContentRef  = React.useRef<HTMLTableElement>(null);
  const [tableWidth, setTableWidth] = useState(1000);
  const isSyncingLeft = React.useRef(false);

  useEffect(() => {
    const updateWidth = () => {
      if (tableContentRef.current) setTableWidth(tableContentRef.current.scrollWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [customers]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingLeft.current) return;
    if (tableScrollRef.current) {
      isSyncingLeft.current = true;
      tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isSyncingLeft.current = false; }, 10);
    }
  };
  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingLeft.current) return;
    if (topScrollRef.current) {
      isSyncingLeft.current = true;
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
      setTimeout(() => { isSyncingLeft.current = false; }, 10);
    }
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      setFetchError(`ডাটা লোড করতে সমস্যা হয়েছে: ${error.message}`);
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('এই কাস্টমারকে মুছে ফেলবেন?')) return;
    const { error } = await supabase
      .from('customers').update({ is_deleted: true }).eq('id', id);
    if (!error) fetchCustomers();
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('name, phone, address, total_orders, total_spent, created_at')
        .eq('shop_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error('এখনো কোনো কাস্টমার নেই, Export করার কিছু নেই।');
        return;
      }

      const csv = Papa.unparse(data, { header: true });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`✅ ${data.length} জন কাস্টমারের ডাটা Export হয়েছে!`);
    } catch (err: any) {
      toast.error('Export ব্যর্থ: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Reward ─────────────────────────────────────────────────────────────────
  const triggerRewardIfEligible = useCallback(async () => {
    if (!user) return;
    if (localStorage.getItem(LS_KEY) === 'true') return;
    try {
      const { data: shopRow } = await supabase
        .from('shops').select('reward_customer_list_claimed').eq('id', user.id).single();
      if (shopRow?.reward_customer_list_claimed === true) {
        localStorage.setItem(LS_KEY, 'true'); return;
      }
      setShowRewardPopup(true);
      const { error } = await supabase
        .from('shops').update({ reward_customer_list_claimed: true }).eq('id', user.id);
      if (!error) localStorage.setItem(LS_KEY, 'true');
    } catch { /* silent */ }
  }, [user]);

  // ── Bulk SMS ───────────────────────────────────────────────────────────────
  const handleSendSms = async () => {
    if (customers.length === 0) { toast.error('কোনো কাস্টমার নেই!'); return; }
    const phoneNumbers = customers.map(c => c.phone).filter(Boolean);
    if (phoneNumbers.length === 0) { toast.error('কোনো ফোন নম্বর পাওয়া যায়নি!'); return; }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('সেশন পাওয়া যায়নি!'); setIsSending(false); return; }

      const response = await fetch('https://otvzexarrpuaewjjdxna.supabase.co/functions/v1/bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dnpleGFycnB1YWV3ampkeG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTgyMzcsImV4cCI6MjA5MDk3NDIzN30.2SMR4Gt8SShEqzf2T448iPc8U_mQcv0yB51JXSN-ov8',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumbers, message: smsMessage.trim() }),
      });

      const txt = await response.text();
      let res: any = {};
      try { res = JSON.parse(txt); } catch { if (!response.ok) throw new Error(txt); }
      if (!response.ok) throw new Error(res?.error || txt);

      toast.success(`✅ ${res?.sent_to || phoneNumbers.length} জন কাস্টমারকে SMS পাঠানো হয়েছে!`);
      setShowSmsModal(false);
      setSmsMessage('');
      triggerRewardIfEligible();
    } catch (err: any) {
      toast.error(err.message || 'অজানা সমস্যা হয়েছে।');
    } finally {
      setIsSending(false);
    }
  };

  const MAX_SMS = 160;
  const charCount    = smsMessage.length;
  const smsPartCount = Math.ceil(charCount / MAX_SMS) || 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="কাস্টমার ডিরেক্টরি (CRM)" subtitle="আপনার কাস্টমার ডাটাবেস এবং Bulk SMS সিস্টেম">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">

        {/* ── Toolbar ── */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 bg-white sticky top-0 z-20 shadow-sm">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0F6E56]" />
            কাস্টমার লিস্ট
            {customers.length > 0 && (
              <span className="bg-[#0F6E56]/10 text-[#0F6E56] text-xs font-extrabold px-2 py-0.5 rounded-full">{customers.length} জন</span>
            )}
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export */}
            <button
              onClick={handleExport}
              disabled={isExporting || customers.length === 0 || isLoading}
              className="flex items-center gap-1.5 border-2 border-gray-200 text-gray-600 px-3 py-2 rounded-lg font-bold text-sm hover:border-[#0F6E56] hover:text-[#0F6E56] hover:bg-[#0F6E56]/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>

            {/* Import */}
            <button
              onClick={() => setShowImportModal(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5 border-2 border-gray-200 text-gray-600 px-3 py-2 rounded-lg font-bold text-sm hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>

            {/* Bulk SMS */}
            <button
              onClick={() => setShowSmsModal(true)}
              disabled={customers.length === 0 || isLoading}
              className="bg-[#0F6E56] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1D9E75] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="w-4 h-4" /> Bulk SMS
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">লোড হচ্ছে... ⏳</div>
        ) : fetchError ? (
          <div className="p-8 text-center">
            <p className="text-red-500 font-bold mb-2">⚠️ ডাটা লোড হয়নি</p>
            <p className="text-red-400 text-sm font-en mb-4">{fetchError}</p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <div ref={topScrollRef} onScroll={handleTopScroll} className="overflow-x-auto w-full mb-3">
              <div style={{ width: `${tableWidth}px`, height: '1px' }} />
            </div>
            <div className="relative w-full overflow-hidden border rounded-lg">
              <div ref={tableScrollRef} onScroll={handleBottomScroll}
                className="max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto w-full custom-scrollbar">
                <table ref={tableContentRef} className="w-full text-left border-collapse whitespace-nowrap text-sm font-en">
                  <thead className="sticky top-0 z-20 bg-white shadow-sm border-b-2 border-gray-200 text-gray-700">
                    <tr>
                      <th className="p-4 font-medium sticky left-0 z-30 bg-white shadow-[1px_0_0_#e2e8f0]">Customer ID</th>
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Phone Number</th>
                      <th className="p-4 font-medium text-center">Total Orders</th>
                      <th className="p-4 font-medium text-right">Total Spent</th>
                      <th className="p-4 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-gray-400">
                          <p className="text-4xl mb-3">👤</p>
                          <p className="font-bold text-gray-600 mb-1">কোনো কাস্টমার পাওয়া যায়নি</p>
                          <p className="text-sm">নতুন পার্সেল এন্ট্রি বা CSV Import করলে কাস্টমার অটোমেটিক যুক্ত হবে।</p>
                        </td>
                      </tr>
                    ) : customers.map(cust => (
                      <tr key={cust.id} className="group border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-extrabold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[1px_0_0_#e2e8f0]">{String(cust.id).slice(0, 8).toUpperCase()}</td>
                        <td className="p-4 font-bold text-gray-700">{cust.name}</td>
                        <td className="p-4 text-gray-600 font-medium">{cust.phone}</td>
                        <td className="p-4 text-center font-extrabold text-[#3B82F6]">{cust.total_orders}</td>
                        <td className="p-4 text-right font-extrabold text-[#0F6E56]">৳ {Number(cust.total_spent).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDelete(cust.id)}
                            className="p-1.5 bg-red-50 rounded hover:bg-red-500 hover:text-white text-red-500 transition" title="মুছুন">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BULK SMS MODAL ── */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] p-6 text-white">
              <button onClick={() => { setShowSmsModal(false); setSmsMessage(''); }}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-white/20 p-2 rounded-xl"><MessageCircle className="w-6 h-6" /></div>
                <h2 className="text-xl font-extrabold">Bulk SMS ক্যাম্পেইন</h2>
              </div>
              <p className="text-white/80 text-sm font-medium">সকল কাস্টমারকে একসাথে মেসেজ পাঠান</p>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 bg-[#0F6E56]/5 border border-[#0F6E56]/20 rounded-xl px-4 py-3">
                <Users className="w-5 h-5 text-[#0F6E56] shrink-0" />
                <p className="text-sm font-bold text-gray-800">
                  <span className="text-[#0F6E56] text-base">{customers.length} জন</span> কাস্টমারকে SMS পাঠানো হবে
                  <span className="text-gray-500 font-medium ml-1">({customers.length} ক্রেডিট ব্যয় হবে)</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">মেসেজ লিখুন</label>
                <textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} rows={5} maxLength={640}
                  placeholder="যেমন: প্রিয় কাস্টমার, আমাদের ঈদ সেলে ৩০% ছাড়! আজই অর্ডার করুন।"
                  className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20 outline-none transition resize-none text-sm leading-relaxed" />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-400 font-medium">
                    {smsPartCount > 1
                      ? <span className="text-amber-500 font-bold">⚠️ {smsPartCount} SMS parts ({charCount} chars)</span>
                      : <span>{charCount} / {MAX_SMS} characters</span>}
                  </p>
                  <p className="text-xs font-bold text-gray-400">মোট: <span className="text-[#0F6E56]">{customers.length * smsPartCount} ক্রেডিট</span></p>
                </div>
              </div>
              <div className="bg-orange-50 text-amber-700 text-sm p-2 rounded-md border border-orange-200 font-medium">
                ⚠️ সতর্কতা (বিটিআরসি নিয়ম): প্রোমোশনাল এসএমএস বাংলায় লিখুন।
              </div>
              {smsPartCount > 1 && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                  <span className="shrink-0">⚠️</span>
                  <span>মেসেজটি {smsPartCount}টি পার্টে যাবে — প্রতি পার্টে আলাদা ক্রেডিট কাটবে।</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowSmsModal(false); setSmsMessage(''); }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition">বাতিল</button>
                <button onClick={handleSendSms} disabled={isSending || !smsMessage.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#0F6E56] text-white font-bold hover:bg-[#1D9E75] transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> পাঠানো হচ্ছে...</> : <><Send className="w-4 h-4" /> SMS পাঠান</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT MODAL ── */}
      {showImportModal && user && (
        <ImportCsvModal
          onClose={() => setShowImportModal(false)}
          onImportDone={() => { fetchCustomers(); setShowImportModal(false); }}
          shopId={user.id}
        />
      )}

      {/* ── REWARD POPUP ── */}
      {showRewardPopup && <RewardPopup onClose={() => setShowRewardPopup(false)} />}
    </DashboardLayout>
  );
}
