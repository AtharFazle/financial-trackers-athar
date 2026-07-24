"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/supabase";
import { LogIn, UserPlus, Lock, Wallet, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is already saved in localStorage
    const savedUserId = localStorage.getItem("financial_tracker_user_id");
    if (savedUserId) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Login gagal");

      if (json.data) {
        selectUser(json.data);
      }
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Periksa nama & password Anda.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Gagal membuat profil");

      if (json.data) {
        selectUser(json.data);
      }
    } catch (err: any) {
      console.error("Error creating user:", err.message);
      setError(err.message || "Gagal membuat profil. Silakan coba nama lain.");
      setLoading(false);
    }
  };

  const selectUser = (user: User) => {
    localStorage.setItem("financial_tracker_user_id", user.id);
    localStorage.setItem("financial_tracker_user_name", user.name);
    router.push("/dashboard");
  };

  return (
    <div className="container" style={{ justifyContent: "center" }}>
      <div className="auth-container">
        <div className="auth-card glass" style={{ padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
              }}
            >
              <Wallet size={28} color="#fff" />
            </div>
            <h1 className="mb-1" style={{ fontSize: "1.75rem" }}>
              Financial Tracker
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
              Kelola dan lacak transaksi keuangan Anda secara pintar.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              background: "rgba(15, 23, 42, 0.6)",
              padding: "4px",
              borderRadius: "12px",
              marginBottom: "1.5rem",
            }}
          >
            <button
              className={`btn ${activeTab === "login" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.5rem", fontSize: "0.875rem", borderRadius: "10px", width: "100%" }}
              onClick={() => {
                setActiveTab("login");
                setError("");
              }}
            >
              Masuk
            </button>
            <button
              className={`btn ${activeTab === "register" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.5rem", fontSize: "0.875rem", borderRadius: "10px", width: "100%" }}
              onClick={() => {
                setActiveTab("register");
                setError("");
              }}
            >
              Daftar Baru
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--danger)",
                padding: "0.75rem",
                borderRadius: "10px",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
              }}
            >
              {error}
            </div>
          )}

          {activeTab === "login" ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="form-group">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Nama Profil
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masukkan nama profil Anda..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Masukkan password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={!name.trim() || !password.trim() || loading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                >
                  <LogIn size={18} />
                  {loading ? "Memeriksa..." : "Masuk ke Dashboard"}
                </button>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="form-group">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Nama Profil Baru
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Athar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Password Profil
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Buat password aman..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={!name.trim() || !password.trim() || loading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                >
                  <UserPlus size={18} />
                  {loading ? "Memproses..." : "Buat Profil & Masuk"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
