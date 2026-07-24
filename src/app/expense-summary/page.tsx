"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/lib/supabase";
import {
  ArrowLeft,
  Sparkles,
  PieChart,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingDown,
  Receipt,
  AlertCircle,
  Brain,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  differenceInCalendarDays,
} from "date-fns";
import { id } from "date-fns/locale";

type CategoryGroup = {
  category: string;
  total: number;
  count: number;
  percentage: number;
  items: Transaction[];
};

/**
 * Custom renderer for AI Summary markdown & structured text
 */
function FormattedAISummary({ text }: { text: string }) {
  const lines = text.split("\n");

  const renderInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        const isHighlight = /Rp|%|\d+/.test(inner);
        return (
          <strong
            key={idx}
            style={{
              color: isHighlight ? "#fef08a" : "#e0e7ff",
              fontWeight: 600,
              padding: isHighlight ? "0.1rem 0.35rem" : "0",
              borderRadius: "4px",
              background: isHighlight ? "rgba(254, 240, 138, 0.12)" : "transparent",
            }}
          >
            {inner}
          </strong>
        );
      }
      return part;
    });
  };

  const sections: { title: string; items: string[] }[] = [];
  let currentSection: { title: string; items: string[] } | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const isHeader =
      /^(?:\d+\.|\#+)?\s*\*\*(.*?)\*\*/.test(trimmed) &&
      (trimmed.includes("📊") ||
        trimmed.includes("🔥") ||
        trimmed.includes("💡") ||
        trimmed.includes("⭐") ||
        trimmed.includes("Ringkasan") ||
        trimmed.includes("Analisis") ||
        trimmed.includes("Potensi") ||
        trimmed.includes("Rating"));

    if (isHeader || /^(?:\d+\.|\#+)\s+[📊🔥💡⭐]/.test(trimmed)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const cleanTitle = trimmed
        .replace(/^[\d#\.\s]+/, "")
        .replace(/^\*\*/, "")
        .replace(/\*\*$/, "");
      currentSection = { title: cleanTitle, items: [] };
    } else {
      if (!currentSection) {
        currentSection = { title: "📊 Ringkasan Keuangan", items: [] };
      }
      currentSection.items.push(trimmed);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    return <div style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>{renderInline(text)}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {sections.map((sec, idx) => {
        const isRating = sec.title.includes("⭐") || sec.title.toLowerCase().includes("rating");
        const isWarning = sec.title.includes("🔥") || sec.title.toLowerCase().includes("terbesar");
        const isTips =
          sec.title.includes("💡") ||
          sec.title.toLowerCase().includes("saran") ||
          sec.title.toLowerCase().includes("potensi");

        return (
          <div
            key={idx}
            style={{
              background: isRating
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))"
                : isWarning
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(245, 158, 11, 0.12))"
                : isTips
                ? "linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(99, 102, 241, 0.12))"
                : "rgba(15, 23, 42, 0.65)",
              padding: "1.1rem 1.25rem",
              borderRadius: "14px",
              border: isRating
                ? "1px solid rgba(16, 185, 129, 0.3)"
                : isWarning
                ? "1px solid rgba(239, 68, 68, 0.25)"
                : isTips
                ? "1px solid rgba(168, 85, 247, 0.25)"
                : "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h4
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.05rem",
                fontWeight: 600,
                color: isRating
                  ? "#34d399"
                  : isWarning
                  ? "#fca5a5"
                  : isTips
                  ? "#c084fc"
                  : "#a5b4fc",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {sec.title}
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {sec.items.map((item, itemIdx) => {
                const isBullet = item.startsWith("-") || item.startsWith("•") || /^\d+\./.test(item);
                const cleanItem = item.replace(/^[\-•\d\.]+\s*/, "");

                return (
                  <div
                    key={itemIdx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.6rem",
                      fontSize: "0.875rem",
                      lineHeight: "1.6",
                      color: "#cbd5e1",
                    }}
                  >
                    {isBullet && (
                      <span
                        style={{
                          display: "inline-block",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isRating
                            ? "#10b981"
                            : isWarning
                            ? "#ef4444"
                            : isTips
                            ? "#a855f7"
                            : "#6366f1",
                          marginTop: "0.55rem",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>{renderInline(cleanItem)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ExpenseSummaryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filter state
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const firstOfMonthStr = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState<string>(firstOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Expanded category breakdown state
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
          user_id: uid,
        },
      });

      const { data, error } = await res.json();
      if (!res.ok) throw new Error(error || "Gagal mengambil data transaksi");

      setTransactions(data || []);
    } catch (err: any) {
      console.error("Error fetching transactions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions for expenses within selected date range
  const filteredExpenses = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return transactions.filter((t) => {
      if (t.type !== "expense") return false;
      const tDate = parseISO(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [transactions, startDate, endDate]);

  // Grand Total Expense
  const grandTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredExpenses]);

  // Number of days in interval
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const days = differenceInCalendarDays(new Date(endDate), new Date(startDate)) + 1;
    return days > 0 ? days : 1;
  }, [startDate, endDate]);

  // Daily Average
  const dailyAverage = useMemo(() => {
    return Math.round(grandTotal / totalDays);
  }, [grandTotal, totalDays]);

  // Group expenses by category
  const categoryGroups = useMemo(() => {
    const groups: { [cat: string]: CategoryGroup } = {};

    filteredExpenses.forEach((t) => {
      const cat = t.category || "Lainnya";
      if (!groups[cat]) {
        groups[cat] = {
          category: cat,
          total: 0,
          count: 0,
          percentage: 0,
          items: [],
        };
      }
      groups[cat].total += t.amount;
      groups[cat].count += 1;
      groups[cat].items.push(t);
    });

    const result = Object.values(groups).map((g) => ({
      ...g,
      percentage: grandTotal > 0 ? (g.total / grandTotal) * 100 : 0,
    }));

    result.sort((a, b) => b.total - a.total);
    return result;
  }, [filteredExpenses, grandTotal]);

  // Preset Date Handlers
  const handlePresetMonthToDate = () => {
    setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setAiSummary(null);
  };

  const handlePresetLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
    setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
    setAiSummary(null);
  };

  const handlePreset30Days = () => {
    setStartDate(format(subDays(new Date(), 29), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setAiSummary(null);
  };

  const handlePreset7Days = () => {
    setStartDate(format(subDays(new Date(), 6), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setAiSummary(null);
  };

  // Generate AI Summary
  const handleFetchAISummary = async () => {
    if (!userId) return;
    setIsAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          user_id: userId,
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mendapatkan analisis AI");

      setAiSummary(json.summary);
    } catch (err: any) {
      setAiError(err.message || "Gagal memproses AI summary");
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const toggleCategoryExpand = (catName: string) => {
    setExpandedCategory(expandedCategory === catName ? null : catName);
  };

  if (!userId) return null;

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            className="btn-secondary"
            style={{ padding: "0.5rem", borderRadius: "12px", width: "auto" }}
            onClick={() => router.push("/dashboard")}
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem" }}>Pengeluaran & AI Summary</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Filter tanggal, analisis kategori & inteligensi AI
            </p>
          </div>
        </div>
      </div>

      {/* Date Filter & Quick Presets Card */}
      <div
        className="glass"
        style={{ padding: "1.25rem", borderRadius: "16px", marginBottom: "1.5rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Calendar size={18} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: "1rem" }}>Pilih Rentang Tanggal</h3>
        </div>

        {/* Start Date & End Date Pickers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Start Date
            </label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setAiSummary(null);
              }}
              style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", colorScheme: "dark" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              End Date
            </label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setAiSummary(null);
              }}
              style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", colorScheme: "dark" }}
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          <button
            className="btn btn-secondary"
            style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            onClick={handlePresetMonthToDate}
          >
            Bulan Ini
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            onClick={handlePresetLastMonth}
          >
            Bulan Lalu
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            onClick={handlePreset30Days}
          >
            30 Hari
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: "auto", padding: "0.4rem 0.75rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
            onClick={handlePreset7Days}
          >
            7 Hari
          </button>
        </div>
      </div>

      {/* Expense Overview Card */}
      <div
        className="glass mb-4"
        style={{
          padding: "1.5rem",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(99, 102, 241, 0.1))",
          border: "1px solid rgba(239, 68, 68, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingDown size={18} color="var(--danger)" /> Total Pengeluaran
          </span>
          <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "12px", background: "rgba(255,255,255,0.08)" }}>
            {totalDays} Hari
          </span>
        </div>

        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--danger)", marginBottom: "1rem" }}>
          {formatCurrency(grandTotal)}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>
              Total Transaksi
            </span>
            <strong style={{ fontSize: "1rem" }}>{filteredExpenses.length} Transaksi</strong>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block" }}>
              Rata-rata / Hari
            </span>
            <strong style={{ fontSize: "1rem" }}>{formatCurrency(dailyAverage)}</strong>
          </div>
        </div>
      </div>

      {/* AI Financial Summary Card */}
      <div
        className="glass mb-4"
        style={{
          padding: "1.5rem",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))",
          border: "1px solid rgba(168, 85, 247, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Brain size={22} color="#a855f7" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>AI Financial Summary</h3>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFetchAISummary}
            disabled={isAiLoading || filteredExpenses.length === 0}
            style={{
              width: "auto",
              padding: "0.45rem 0.9rem",
              fontSize: "0.85rem",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "linear-gradient(135deg, #a855f7, #6366f1)",
            }}
          >
            {isAiLoading ? (
              <>
                <RefreshCw size={16} className="spin" /> Menganalisis...
              </>
            ) : (
              <>
                <Sparkles size={16} /> {aiSummary ? "Analisis Ulang" : "Analisis dengan AI"}
              </>
            )}
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
            Belum ada transaksi pengeluaran pada rentang tanggal ini untuk dianalisis.
          </p>
        ) : isAiLoading ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <Sparkles size={32} color="#a855f7" className="spin mb-2" style={{ animationDuration: "2s" }} />
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
              AI sedang mempelajari pola pengeluaran Anda...
            </p>
          </div>
        ) : aiError ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--danger)", fontSize: "0.875rem" }}>
            <AlertCircle size={18} />
            <span>{aiError}</span>
          </div>
        ) : aiSummary ? (
          <FormattedAISummary text={aiSummary} />
        ) : (
          <div style={{ background: "rgba(15, 23, 42, 0.4)", padding: "1rem", borderRadius: "12px" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              Klik tombol <strong>"Analisis dengan AI"</strong> di atas untuk mendapatkan rangkuman cerdas, evaluasi keborosan, dan saran penghematan dari AI!
            </p>
          </div>
        )}
      </div>

      {/* Category Grouping Section */}
      <div className="transactions-section">
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PieChart size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Pengeluaran per Kategori</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {categoryGroups.length} Kategori
          </span>
        </div>

        {loading ? (
          <p className="text-center mt-4">Memuat data...</p>
        ) : categoryGroups.length === 0 ? (
          <div className="empty-state glass">
            <Receipt size={48} opacity={0.5} />
            <p>Tidak ada pengeluaran pada rentang tanggal ini.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {categoryGroups.map((group) => {
              const isExpanded = expandedCategory === group.category;

              return (
                <div
                  key={group.category}
                  className="glass"
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "14px",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Category Header Row */}
                  <div
                    onClick={() => toggleCategoryExpand(group.category)}
                    style={{
                      display: "flex",
                      justify: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <strong style={{ fontSize: "1rem" }}>{group.category}</strong>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "10px",
                            background: "rgba(99, 102, 241, 0.2)",
                            color: "#a5b4fc",
                          }}
                        >
                          {group.count} item
                        </span>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {group.percentage.toFixed(1)}% dari total pengeluaran
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--danger)" }}>
                        {formatCurrency(group.total)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={18} color="var(--text-secondary)" />
                      ) : (
                        <ChevronDown size={18} color="var(--text-secondary)" />
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Visual */}
                  <div
                    style={{
                      height: "6px",
                      width: "100%",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: "3px",
                      marginTop: "0.75rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(group.percentage, 100)}%`,
                        background: "linear-gradient(90deg, #ef4444, #f59e0b)",
                        borderRadius: "3px",
                        transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />
                  </div>

                  {/* Expanded Transaction List */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Rincian Transaksi:
                      </span>
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            justify: "space-between",
                            alignItems: "center",
                            padding: "0.4rem 0.6rem",
                            borderRadius: "8px",
                            background: "rgba(15, 23, 42, 0.4)",
                            fontSize: "0.85rem",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{item.description}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              {format(parseISO(item.date), "dd MMM yyyy, HH:mm", { locale: id })}
                            </div>
                          </div>
                          <div style={{ color: "var(--danger)", fontWeight: 500 }}>
                            -{formatCurrency(item.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
