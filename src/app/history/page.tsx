"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/lib/supabase";
import { ArrowLeft, TrendingUp, TrendingDown, Search, Wallet } from "lucide-react";
import { format, parseISO, isSameDay, startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

type FilterType = 'day' | 'week' | 'month' | 'all';

export default function History() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const savedId = localStorage.getItem("financial_tracker_user_id");
    if (!savedId) {
      router.push("/");
      return;
    }
    setUserId(savedId);
    fetchTransactions(savedId);
  }, [router]);

  const fetchTransactions = async (uid: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/transactions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user_id": uid,
        },
      });

      const { data, error } = await res.json();
      if (!res.ok) throw new Error(error || "Failed to fetch transactions");
      setTransactions(data || []);
    } catch (err: any) {
      console.error("Error fetching transactions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // Filter Logic
  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    
    const tDate = parseISO(t.date);
    const filterDate = parseISO(selectedDate);

    if (filterType === 'day') {
      return isSameDay(tDate, filterDate);
    } 
    else if (filterType === 'week') {
      const start = startOfWeek(filterDate, { weekStartsOn: 1 }); // Monday start
      const end = endOfWeek(filterDate, { weekStartsOn: 1 });
      return isWithinInterval(tDate, { start, end });
    } 
    else if (filterType === 'month') {
      const start = startOfMonth(filterDate);
      const end = endOfMonth(filterDate);
      return isWithinInterval(tDate, { start, end });
    }
    return true;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (!userId) return null;

  return (
    <div className="container">
      <div className="dashboard-header" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="btn-secondary" style={{ padding: "0.5rem", borderRadius: "12px", width: "auto" }} onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0 }}>Laporan Keuangan</h2>
        </div>
      </div>

      {/* Filter Section */}
      <div className="glass" style={{ padding: "1.5rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
            <button 
              className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
              onClick={() => setFilterType('all')}
            >
              Semua Waktu
            </button>
            <button 
              className={`btn ${filterType === 'day' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
              onClick={() => setFilterType('day')}
            >
              Harian
            </button>
            <button 
              className={`btn ${filterType === 'week' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
              onClick={() => setFilterType('week')}
            >
              Mingguan
            </button>
            <button 
              className={`btn ${filterType === 'month' ? 'btn-primary' : 'btn-secondary'}`} 
              style={{ width: "auto", padding: "0.5rem 1rem", fontSize: "0.875rem", whiteSpace: "nowrap" }}
              onClick={() => setFilterType('month')}
            >
              Bulanan
            </button>
          </div>

          {filterType !== 'all' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {filterType === 'day' ? 'Pilih Tanggal' : 
                 filterType === 'week' ? 'Pilih Tanggal dalam Minggu' : 'Pilih Tanggal dalam Bulan'}
              </label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", colorScheme: "dark" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="stats-grid glass mb-4" style={{ padding: "1.5rem", borderRadius: "16px" }}>
        <div className="stat-item">
          <span className="stat-label flex items-center gap-2">Pemasukan</span>
          <span className="stat-value income" style={{ fontSize: "1.25rem" }}>{formatCurrency(totalIncome)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label flex items-center gap-2">Pengeluaran</span>
          <span className="stat-value expense" style={{ fontSize: "1.25rem" }}>{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      {/* Transaction List */}
      <div className="transactions-section">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Rincian Transaksi</h3>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {filteredTransactions.length} transaksi
          </span>
        </div>

        {loading ? (
          <p className="text-center mt-4">Memuat data...</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state glass">
            <Search size={48} opacity={0.5} />
            <p>Tidak ada transaksi pada periode ini.</p>
          </div>
        ) : (
          <div className="transaction-list glass">
            {filteredTransactions.map(t => (
              <div key={t.id} className="transaction-item">
                <div className="transaction-left">
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
                <div className={`transaction-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
