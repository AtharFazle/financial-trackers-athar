"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/lib/supabase";
import { PlusCircle, MinusCircle, LogOut, TrendingUp, TrendingDown, Wallet, X, Trash2, CalendarDays, Eye, EyeOff, ScanText, Check, ChevronLeft, Sparkles, AlertCircle, Mic, MicOff } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

const terbilang = (angka: number): string => {
  const bilangan = [
    '', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'
  ];

  if (angka === 0) return '';
  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' puluh ' + (angka % 10 > 0 ? terbilang(angka % 10) : '');
  if (angka < 200) return 'seratus ' + (angka - 100 > 0 ? terbilang(angka - 100) : '');
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' ratus ' + (angka % 100 > 0 ? terbilang(angka % 100) : '');
  if (angka < 2000) return 'seribu ' + (angka - 1000 > 0 ? terbilang(angka - 1000) : '');
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' ribu ' + (angka % 1000 > 0 ? terbilang(angka % 1000) : '');
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' juta ' + (angka % 1000000 > 0 ? terbilang(angka % 1000000) : '');
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' miliar ' + (angka % 1000000000 > 0 ? terbilang(angka % 1000000000) : '');
  if (angka < 1000000000000000) return terbilang(Math.floor(angka / 1000000000000)) + ' triliun ' + (angka % 1000000000000 > 0 ? terbilang(angka % 1000000000000) : '');
  return '';
};

type ParsedTransaction = {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
};

const EXPENSE_CATEGORIES = ["Makanan", "Pacaran", "Liburan", "Transportasi", "Belanja", "Tagihan", "Top up", "Lainnya"];
const INCOME_CATEGORIES = ["Gaji", "Lemburan", "Lainnya"];

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaldoVisible, setIsSaldoVisible] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [filter,setFilter] = useState({
    category: "all",
    search: "",
  })
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Makanan");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputOtherCategory = useRef<HTMLInputElement>(null);

  // Scan text state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanText, setScanText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchCategory = filter.category === 'all' || transaction.category === filter.category;
    const matchSearch = filter.search === '' || 
                        transaction.description.toLowerCase().includes(filter.search.toLowerCase()) ||
                        transaction.category.toLowerCase().includes(filter.search.toLowerCase());
    return matchCategory && matchSearch;
  });

  useEffect(() => {
    const savedId = localStorage.getItem("financial_tracker_user_id");
    const savedName = localStorage.getItem("financial_tracker_user_name");
    const saldoVisible = localStorage.getItem("financial_tracker_saldo_visible");

    setIsSaldoVisible(saldoVisible === "true");
    
    if (!savedId) {
      router.push("/");
      return;
    }
    
    setUserId(savedId);
    setUserName(savedName);
    fetchTransactions(savedId);

    // Check speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }

    return () => {
      // Cleanup speech recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [router]);

  const fetchTransactions = async (uid: string) => {
    try {
      setLoading(true);

      const startDate = new Date(1972, 0, 1); // 1 Jan 1972
      const endDate = new Date(2100, 11, 31); // 31 Dec 2100

      const res = await fetch("/api/transactions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user_id": uid,
          "date_start": startDate.toISOString(),
          "date_end": endDate.toISOString()
        }
      });

      const { data, error } = await res.json();
      if (error) throw error;

      setTransactions(data || []);
    } catch (err: any) {
      console.error("Error fetching transactions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const customSetCategory = async (value: string) => {
    if (value !== "Lainnya") {
      setCategory(value);
      setIsCustomCategory(false);
    } else {
      setCategory("");
      setTimeout(() => {
        inputOtherCategory.current?.focus();
      }, 100);
      setIsCustomCategory(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("financial_tracker_user_id");
    localStorage.removeItem("financial_tracker_user_name");
    router.push("/");
  };

  const openModal = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setAmount("");
    setDescription("");

    if(type == 'expense'){
      setCategory("Makanan");
    }else {
      setCategory("Gaji")
    }

    setIsCustomCategory(false);
    setIsModalOpen(true);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Hanya angka
    setAmount(value);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !amount || !description) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 500) {
      alert("Jumlah harus minimal 500");
      return;
    };

    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user_id": userId,
        },
        body: JSON.stringify({
          type: transactionType,
          amount: numAmount,
          description,
          category: category || "Lainnya",
          date: new Date().toISOString(),
        }),
      });

      const { data, error } = await res.json();
      if (!res.ok) throw new Error(error || "Failed to add transaction");

      if (data) {
        setTransactions([data, ...transactions]);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      console.error("Error adding transaction:", err.message);
      alert("Gagal menambahkan transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
        headers: {
          "user_id": userId!,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");

      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err: any) {
      console.error("Error deleting transaction:", err.message);
      alert("Gagal menghapus transaksi.");
    }
  };

  // ========== SCAN TEXT HANDLERS ==========
  const openScanModal = () => {
    setScanText("");
    setParseError(null);
    setParsedTransactions([]);
    setIsConfirmModalOpen(false);
    setSaveSuccess(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setIsScanModalOpen(true);
  };

  const closeScanModal = () => {
    if(parsedTransactions.length > 0){
      setIsConfirmModalOpen(true);
    }else{
      setIsScanModalOpen(false);
      setIsModalOpen(false);
      setScanText("");
      setTransactionType('expense');
      setAmount("");
      setDescription("");
      setCategory("Makanan");
      setIsCustomCategory(false);
    }
  };

  // ========== SPEECH RECOGNITION HANDLERS ==========
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setParseError("Browser Anda tidak mendukung speech recognition. Gunakan Chrome atau Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Snapshot teks awal sekali saja, jangan baca scanText di tiap onresult
    const baseText = scanText ? scanText.trimEnd() + ' ' : '';
    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      setParseError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setScanText(baseText + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setParseError('Akses mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser.');
      } else if (event.error === 'no-speech') {
        setParseError('Tidak ada suara terdeteksi. Coba bicara lebih keras.');
      } else if (event.error !== 'aborted') {
        setParseError(`Error speech recognition: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Commit interim terakhir agar tidak hilang saat berhenti
      setScanText(baseText + finalTranscript);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleParseText = async () => {
    if (!userId || !scanText.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/transactions/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user_id": userId,
        },
        body: JSON.stringify({ text: scanText.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses teks");
      }

      if (json.transactions.length === 0) {
        setParseError("Tidak ditemukan transaksi dalam teks. Coba tulis dengan lebih detail, contoh: 'makan nasi goreng 25rb'");
        return;
      }

      setParsedTransactions(json.transactions);
      setIsScanModalOpen(false);
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      setParseError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const updateParsedTransaction = (index: number, field: keyof ParsedTransaction, value: string | number) => {
    setParsedTransactions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // When toggling type, also reset category
      if (field === 'type') {
        updated[index].category = value === 'income' ? 'Gaji' : 'Makanan';
      }

      return updated;
    });
  };

  const removeParsedTransaction = (index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (!userId || parsedTransactions.length === 0) return;

    setIsSavingAll(true);

    try {
      const savedTransactions: Transaction[] = [];

      for (const pt of parsedTransactions) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "user_id": userId,
          },
          body: JSON.stringify({
            type: pt.type,
            amount: pt.amount,
            description: pt.description,
            category: pt.category || "Lainnya",
            date: pt.date || new Date().toISOString(),
          }),
        });

        const { data, error } = await res.json();
        if (!res.ok) throw new Error(error || "Failed to save transaction");

        if (data) {
          savedTransactions.push(data);
        }
      }

      // Add all saved transactions to the list
      setTransactions(prev => [...savedTransactions, ...prev]);
      setSaveSuccess(true);

      // Close after a brief animation
      setTimeout(() => {
        setIsConfirmModalOpen(false);
        setParsedTransactions([]);
        setSaveSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving transactions:", err.message);
      alert(`Gagal menyimpan transaksi: ${err.message}`);
    } finally {
      setIsSavingAll(false);
    }
  };


  const formatParsedDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy', { locale: id });
    } catch {
      return format(new Date(), 'dd MMM yyyy', { locale: id });
    }
  };

  const displayAmount = amount ? Number(amount).toLocaleString('id-ID') : "";
  const spelledAmount = amount ? terbilang(Number(amount)).trim() : "";

  // Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = totalIncome - totalExpense;

  const thisMonthExpense = filteredTransactions
    .filter(t =>{
      const filterDate = parseISO(new Date().toISOString());
      const start = startOfMonth(filterDate);
      const end = endOfMonth(filterDate);
      return isWithinInterval(parseISO(t.date), { start, end }) && t.type === 'expense';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const thisWeekExpense = filteredTransactions
    .filter(t=>{
      const filterDate = parseISO(new Date().toISOString());
      const start = startOfWeek(filterDate, { weekStartsOn: 1 });
      const end = endOfWeek(filterDate, { weekStartsOn: 1 });
      return isWithinInterval(parseISO(t.date), { start, end }) && t.type === 'expense';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  if (!userId) return null; // Will redirect

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Selamat Datang,</p>
          <h2 style={{ margin: 0 }}>{userName}</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary" style={{ padding: "0.5rem", borderRadius: "12px", width: "auto" }} onClick={() => router.push("/history")} title="Laporan & Riwayat">
            <CalendarDays size={20} />
          </button>
          <button className="btn-secondary" style={{ padding: "0.5rem", borderRadius: "12px", width: "auto", color: "var(--danger)" }} onClick={handleLogout} title="Keluar">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="balance-card glass">
        <div className="balance-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span>Total Saldo</span>
          {isSaldoVisible ? (
            <EyeOff size={20} onClick={() => setIsSaldoVisible(false)} />
          ) : (
            <Eye size={20} onClick={() => setIsSaldoVisible(true)} />
          )}
        </div>
        <div className={`balance-amount ${balance < 0 ? 'negative' : 'positive'}`}>
          {isSaldoVisible ? formatCurrency(balance) : "*************"}
        </div>
        
        
        {/* <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label flex items-center gap-2"><TrendingUp size={14} color="var(--secondary)" /> Pemasukan</span>
            <span className="stat-value income">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label flex items-center gap-2"><TrendingDown size={14} color="var(--danger)" /> Pengeluaran</span>
            <span className="stat-value expense">{formatCurrency(totalExpense)}</span>
          </div>
        </div> */}
      </div>

            <div className="action-grid">
        <button className="btn btn-success flex items-center justify-center" onClick={() => openModal('income')}>
          <PlusCircle size={20} />
          Pemasukan
        </button>
        <button className="btn btn-danger flex items-center justify-center" onClick={() => openModal('expense')}>
          <MinusCircle size={20} />
          Pengeluaran
        </button>
      </div>

      {/* Scan Text & Voice Buttons */}
      <div className="scan-buttons-row">
        <button className="btn btn-scan flex items-center justify-center" onClick={openScanModal} id="scan-text-btn">
          <Sparkles size={18} />
          Scan Teks
        </button>
        {/* {speechSupported && (
          <button className="btn btn-voice flex items-center justify-center" onClick={() => {
            openScanModal();
            setTimeout(() => startListening(), 300);
          }} id="voice-input-btn">
            <Mic size={18} />
            Bicara
          </button>
        )} */}
      </div>

      <input 
        type="text" 
        placeholder="Cari..." 
        className="form-control mb-2"
        value={filter.search}
        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
      />
      <select 
          className="form-control" 
          value={filter.category} 
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          style={{ appearance: 'none', marginBottom: "1rem" }}
        >
                      <option value="all">Semua Kategori</option>
                      <option value="Makanan">Makanan</option>
                      <option value="Transportasi">Transportasi</option>
                      <option value="Belanja">Belanja</option>
                      <option value="Tagihan">Tagihan</option>
                      <option value="Gaji">Gaji</option>
                      <option value="pacaran">Pacaran</option>
                      <option value="liburan">Liburan</option>
        </select>

              <div className="stats-grid glass mb-4" style={{ padding: "1rem", borderRadius: "16px", borderTop: "1px solid var(--surface-border)" }}>
        <div className="stat-item">
          <span className="stat-label">Pengeluaran Minggu Ini</span>
          <span className="stat-value" style={{ fontSize: "1.1rem" }}>{formatCurrency(thisWeekExpense)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pengeluaran Bulan Ini</span>
          <span className="stat-value" style={{ fontSize: "1.1rem" }}>{formatCurrency(thisMonthExpense)}</span>
        </div>
      </div>

      <div className="transactions-section">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Riwayat Transaksi</h3>
        </div>

        {loading ? (
          <p className="text-center mt-4">Memuat data...</p>
        ) : transactions.length === 0 ? (
          <div className="empty-state glass">
            <Wallet size={48} opacity={0.5} />
            <p>Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="transaction-list glass">
            {filteredTransactions.map(t => (
              <div key={t.id} className="transaction-item">
                <div className="transaction-left" style={{ flex: 1 }}>
                  <div className={`transaction-icon ${t.type}`}>
                    {t.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div className="transaction-details">
                    <span className="transaction-title">{t.description}</span>
                    <span className="transaction-date">
                      {format(parseISO(t.date), 'dd MMM yyyy, HH:mm', { locale: id })} • {t.category}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className={`transaction-amount ${t.type}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </div>
                  <button 
                    onClick={() => handleDeleteTransaction(t.id)}
                    style={{ color: "var(--danger)", padding: "0.25rem", opacity: 0.7 }}
                    title="Hapus"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Original Add Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0, color: transactionType === 'income' ? 'var(--secondary)' : 'var(--danger)' }}>
                Tambah {transactionType === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label className="form-label">Jumlah (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  min={500}
                  placeholder="Contoh: 50.000"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  required
                />
                {spelledAmount && (
                  <p style={{ fontSize: "0.875rem", color: "var(--secondary)", marginTop: "0.25rem", fontStyle: "italic", textTransform: "capitalize" }}>
                    {spelledAmount} Rupiah
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Makan siang"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Kategori (Opsional)</label>
                {isCustomCategory ? (
                  <input ref={inputOtherCategory} type="text" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori" />
                ) : (
                    <div>
                                <select 
                                  className="form-control" 
                                  value={category} 
                                  onChange={(e) => customSetCategory(e.target.value)}
                                  style={{ appearance: 'none' }}
                                >

                                  {transactionType == "income" ? (
                                    <>
                                      {/* <option value="">Pilih Kategori</option> */}
                                      <option value="Gaji">Gaji</option>
                                      <option value="Lemburan">Lemburan</option>
                                      <option value="Lainnya">Lainnya</option>
                                    </>
                                  ) : (
                                    <>
                                      {/* <option value="">Pilih Kategori</option> */}
                                      <option value="Makanan">Makanan</option>
                                      <option value="pacaran">Pacaran</option>
                                       <option value="liburan">Liburan</option>
                                      <option value="Transportasi">Transportasi</option>
                                      <option value="Belanja">Belanja</option>
                                      <option value="Tagihan">Tagihan</option>
                                      <option value="Top up">Top UP</option>
                                      <option value="Lainnya">Lainnya</option>
                                    </>
                                  )}
                                </select>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className={`btn ${transactionType === 'income' ? 'btn-success' : 'btn-danger'} w-full`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scan Text Input Modal */}
      {isScanModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeScanModal}}>
          <div className="modal-content scan-modal">
            <div className="modal-header">
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={24} className="scan-icon-glow" />
                <span className="scan-title-gradient">Scan Teks</span>
              </h2>
              <button className="modal-close" onClick={closeScanModal}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>
              Tulis, tempel, atau <strong style={{ color: "#c4b5fd" }}>bicara</strong> teks transaksimu. AI akan mengekstrak data secara otomatis.
            </p>

            <div className="scan-examples">
              <span className="scan-example-label">Contoh:</span>
              <div className="scan-example-chips">
                <button 
                  type="button" 
                  className="scan-chip" 
                  onClick={() => setScanText("Kopi 10 ribu rupiah")}
                >
                  &quot;Kopi 10 rb&quot;
                </button>
                <button 
                  type="button" 
                  className="scan-chip" 
                  onClick={() => setScanText("terima gaji bulan ini 5jt")}
                >
                  &quot;gaji 5jt&quot;
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="scan-textarea-wrapper">
                <textarea
                  className={`form-control scan-textarea ${isListening ? 'listening' : ''}`}
                  placeholder={isListening ? "Bicara sekarang... 🎙️" : "Contoh: hari ini makan nasi goreng 25rb, naik grab ke kantor 15rb, sama beli kopi starbucks 18rb..."}
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  disabled={isListening}
                  rows={5}
                  id="scan-text-input"
                  autoFocus
                />
                {speechSupported && (
                  <button
                    type="button"
                    className={`mic-btn ${isListening ? 'active' : ''}`}
                    onClick={toggleSpeechRecognition}
                    title={isListening ? 'Berhenti mendengarkan' : 'Bicara untuk input teks'}
                    id="mic-btn"
                  >
                    {isListening ? (
                      <>
                        <MicOff size={20} />
                        <span className="mic-pulse-ring"></span>
                      </>
                    ) : (
                      <Mic size={20} />
                    )}
                  </button>
                )}
              </div>
              <div className="scan-char-count">
                {isListening && <span className="listening-indicator">● Mendengarkan...</span>}
                <span>{scanText.length} / 5000</span>
              </div>
            </div>

            {parseError && (
              <div className="scan-error">
                <AlertCircle size={16} />
                <span>{parseError}</span>
              </div>
            )}

            <button
              className="btn btn-scan w-full"
              onClick={handleParseText}
              disabled={isParsing || !scanText.trim()}
              id="process-text-btn"
            >
              {isParsing ? (
                <>
                  <span className="scan-loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                  Memproses...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Proses dengan AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSavingAll) setIsConfirmModalOpen(false) }}>
          <div className="modal-content confirm-modal">
            {saveSuccess ? (
              <div className="save-success-state">
                <div className="success-checkmark">
                  <Check size={48} />
                </div>
                <h3>Berhasil Disimpan!</h3>
                <p>{parsedTransactions.length} transaksi telah ditambahkan</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      className="modal-close"
                      onClick={() => {
                        setIsConfirmModalOpen(false);
                        setIsScanModalOpen(true);
                      }}
                      style={{ marginRight: "0.25rem" }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
                      Hasil Scan ({parsedTransactions.length} transaksi)
                    </h2>
                  </div>
                  <button className="modal-close" onClick={() => setIsConfirmModalOpen(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="parsed-list">
                  {parsedTransactions.map((pt, index) => (
                    <div key={index} className="parsed-card">
                      <div className="parsed-card-header">
                        <button
                          type="button"
                          className={`parsed-type-toggle ${pt.type}`}
                          onClick={() => updateParsedTransaction(index, 'type', pt.type === 'income' ? 'expense' : 'income')}
                          title="Klik untuk ubah tipe"
                        >
                          {pt.type === 'income' ? (
                            <><TrendingUp size={14} /> Pemasukan</>
                          ) : (
                            <><TrendingDown size={14} /> Pengeluaran</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="parsed-remove-btn"
                          onClick={() => removeParsedTransaction(index)}
                          title="Hapus"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="parsed-card-body">
                        <div className="parsed-field">
                          <label>Jumlah</label>
                          <div className="parsed-amount-input">
                            <span className="parsed-currency">Rp</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={pt.amount.toLocaleString('id-ID')}
                              onChange={(e) => {
                                const num = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                updateParsedTransaction(index, 'amount', num);
                              }}
                              className="form-control parsed-input"
                            />
                          </div>
                        </div>

                        <div className="parsed-field">
                          <label>Deskripsi</label>
                          <input
                            type="text"
                            value={pt.description}
                            onChange={(e) => updateParsedTransaction(index, 'description', e.target.value)}
                            className="form-control parsed-input"
                          />
                        </div>

                        <div className="parsed-field-row">
                          <div className="parsed-field" style={{ flex: 1 }}>
                            <label>Kategori</label>
                            <select
                              value={pt.category}
                              onChange={(e) => updateParsedTransaction(index, 'category', e.target.value)}
                              className="form-control parsed-input"
                              style={{ appearance: 'none' }}
                            >
                              {(pt.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div className="parsed-field" style={{ flex: 1 }}>
                            <label>Tanggal</label>
                            <input
                              type="date"
                              value={pt.date.split('T')[0]}
                              onChange={(e) => updateParsedTransaction(index, 'date', new Date(e.target.value).toISOString())}
                              className="form-control parsed-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {parsedTransactions.length === 0 ? (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <p>Semua transaksi telah dihapus</p>
                    <button className="btn btn-secondary mt-2" onClick={closeScanModal}>
                      Kembali
                    </button>
                  </div>
                ) : (
                  <div className="confirm-actions">
                    <button
                      className="btn btn-scan w-full"
                      onClick={handleSaveAll}
                      disabled={isSavingAll}
                      id="save-all-btn"
                    >
                      {isSavingAll ? (
                        <>
                          <span className="scan-loading-dots">
                            <span></span><span></span><span></span>
                          </span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Check size={18} />
                          Simpan Semua ({parsedTransactions.length})
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary w-full"
                      onClick={() => setIsConfirmModalOpen(false)}
                      disabled={isSavingAll}
                    >
                      Batal
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
