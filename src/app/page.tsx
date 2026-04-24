"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/lib/supabase";
import { LogIn, UserPlus, Lock, ArrowLeft } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedUserForLogin, setSelectedUserForLogin] = useState<User | null>(null);
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    fetchUsers();
    // Check if user is already selected in localStorage
    const savedUserId = localStorage.getItem("financial_tracker_user_id");
    if (savedUserId) {
      router.push("/dashboard");
    }
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Gagal memuat pengguna");
      setUsers(json.data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPassword.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName.trim(), password: newUserPassword }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Gagal membuat pengguna");

      if (json.data) {
        selectUser(json.data);
      }
    } catch (err: any) {
      console.error("Error creating user:", err.message);
      setError("Gagal membuat profil. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForLogin) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserForLogin.id, password: loginPassword }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Password salah!");

      if (json.data) {
        selectUser(json.data);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const selectUser = (user: User) => {
    localStorage.setItem("financial_tracker_user_id", user.id);
    localStorage.setItem("financial_tracker_user_name", user.name);
    router.push("/dashboard");
  };

  return (
    <div className="container">
      <div className="auth-container">
        <div className="auth-card glass">
          <h1 className="mb-2">Financial Tracker</h1>
          <p className="mb-4">
            {selectedUserForLogin 
              ? `Masukkan password untuk ${selectedUserForLogin.name}` 
              : "Pilih atau buat profil untuk mulai mencatat keuangan Anda."}
          </p>

          {error && <p style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.875rem" }}>{error}</p>}

          {selectedUserForLogin ? (
            // Login Form
            <form onSubmit={handleLogin} className="form-group" style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!loginPassword.trim() || loading}
                >
                  <LogIn size={20} />
                  {loading ? 'Memeriksa...' : 'Masuk'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedUserForLogin(null);
                    setLoginPassword("");
                    setError("");
                  }}
                >
                  <ArrowLeft size={20} />
                  Kembali
                </button>
              </div>
            </form>
          ) : (
            // Create & List Profile
            <>
              <form onSubmit={handleCreateUser} className="form-group">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama Profil Baru..."
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password Profil Baru..."
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary mt-2"
                    disabled={!newUserName.trim() || !newUserPassword.trim() || loading}
                  >
                    <UserPlus size={20} />
                    Buat Profil Baru
                  </button>
                </div>
              </form>

              <div style={{ margin: "2rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
                <hr style={{ flex: 1, borderColor: "var(--surface-border)" }} />
                <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>ATAU PILIH PROFIL</span>
                <hr style={{ flex: 1, borderColor: "var(--surface-border)" }} />
              </div>

              <div className="user-list">
                {loading ? (
                  <p>Memuat profil...</p>
                ) : users.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>Belum ada profil terdaftar.</p>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      className="user-item"
                      onClick={() => {
                        setSelectedUserForLogin(user);
                        setError("");
                      }}
                    >
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: "1rem" }}>{user.name}</h3>
                      </div>
                      <Lock size={16} color="var(--text-secondary)" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
