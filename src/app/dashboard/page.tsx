"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/lib/supabase";
import { PlusCircle, MinusCircle, LogOut, TrendingUp, TrendingDown, Wallet, X, Trash2, CalendarDays, Eye, EyeOff } from "lucide-react";
import { format, isThisWeek, isThisMonth, parseISO, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
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
  }, [router]);

  const fetchTransactions = async (uid: string) => {
    try {
      setLoading(true);

      const now = new Date();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const res = await fetch("/api/transactions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user_id": uid,
          "date_start": startOfMonth.toISOString(),
          "date_end": startOfNextMonth.toISOString()
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
    setCategory("Makanan");
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

      {/* Modal */}
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
                                      <option value="Lainnya">Lainnya</option>
                                    </>
                                  ) : (
                                    <>
                                      {/* <option value="">Pilih Kategori</option> */}
                                      <option value="Makanan">Makanan</option>
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
    </div>
  );
}
