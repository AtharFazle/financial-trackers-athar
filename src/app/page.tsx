"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, User } from "@/lib/supabase";
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
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err.message);
      // We don't block the UI if it fails, just show empty
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
      const { data, error } = await supabase
        .from("users")
        .insert([{ name: newUserName.trim(), password: newUserPassword }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        selectUser(data);
      }
    } catch (err: any) {
      console.error("Error creating user:", err.message);
      setError("Gagal membuat user. Pastikan Supabase sudah di-setup dengan benar.");
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForLogin) return;
    
    // Validate password
    if (selectedUserForLogin.password === loginPassword) {
      selectUser(selectedUserForLogin);
    } else {
      setError("Password salah!");
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
                  disabled={!loginPassword.trim()}
                >
                  <LogIn size={20} />
                  Masuk
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
