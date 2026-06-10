"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.must_change_password && data.user.role === "STUDENT")
        router.push("/student/change-password");
      else if (data.user.role === "ADMIN") router.push("/admin/dashboard");
      else router.push("/student/home");
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "DM Sans, sans-serif",
      padding: "1rem",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}

        .bg-photo {
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80');
          background-size: cover; background-position: center;
          filter: blur(6px) brightness(0.35) saturate(1.2);
          transform: scale(1.05);
          z-index: 0;
        }
        .bg-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(20,8,0,0.75) 0%, rgba(120,40,0,0.55) 50%, rgba(20,8,0,0.8) 100%);
          z-index: 1;
        }

        .card {
          position: relative; z-index: 2;
          width: 100%; max-width: 420px;
          background: rgba(255,255,255,0.10);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 24px;
          padding: 2.75rem 2.25rem;
          box-shadow: 0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .brand-icon {
          width: 50px; height: 50px; border-radius: 14px;
          background: linear-gradient(135deg, #E85D24, #F59E0B);
          display: flex; align-items: center; justify-content: center;
          font-family: Syne, sans-serif; font-weight: 800; font-size: 1.15rem;
          color: #fff; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(232,93,36,0.45);
        }
        .brand-name {
          font-family: Syne, sans-serif; font-weight: 800; font-size: 1.1rem;
          color: #fff; line-height: 1.2; letter-spacing: -0.01em;
        }
        .brand-sub { font-size: 0.72rem; color: rgba(255,255,255,0.5); margin-top: 2px; }

        .heading {
          font-family: Syne, sans-serif; font-weight: 800; font-size: 1.65rem;
          color: #fff; letter-spacing: -0.03em; margin-bottom: 0.2rem;
        }
        .subheading { font-size: 0.87rem; color: rgba(255,255,255,0.55); margin-bottom: 1.75rem; }

        .field { margin-bottom: 1rem; }
        .field label {
          display: block; font-size: 0.68rem; font-weight: 700;
          color: rgba(255,255,255,0.5); text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 6px;
        }
        .field input {
          width: 100%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 11px; padding: 0.8rem 1rem;
          font-size: 0.95rem; font-family: DM Sans, sans-serif;
          color: #fff; outline: none;
          transition: all 0.15s;
        }
        .field input::placeholder { color: rgba(255,255,255,0.3); }
        .field input:focus {
          border-color: #E85D24;
          background: rgba(255,255,255,0.12);
          box-shadow: 0 0 0 3px rgba(232,93,36,0.2);
        }

        .btn {
          width: 100%; margin-top: 0.75rem;
          background: linear-gradient(135deg, #E85D24 0%, #F59E0B 100%);
          color: #fff; border: none; border-radius: 12px;
          padding: 0.92rem; font-size: 0.97rem; font-weight: 600;
          font-family: DM Sans, sans-serif; cursor: pointer;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(232,93,36,0.4);
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .err {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.35);
          border-radius: 9px; padding: 0.65rem 0.9rem;
          font-size: 0.84rem; color: #FCA5A5; margin-bottom: 1rem;
        }

        .divider {
          display: flex; align-items: center; gap: 10px;
          margin: 1.5rem 0 1rem;
        }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .divider-text { font-size: 0.72rem; color: rgba(255,255,255,0.3); }

        .footer-note {
          text-align: center; margin-top: 1.5rem;
          font-size: 0.74rem; color: rgba(255,255,255,0.3);
        }

        .food-tags {
          display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.75rem;
        }
        .food-tag {
          font-size: 0.72rem; font-weight: 600;
          background: rgba(232,93,36,0.15);
          color: #F59E0B;
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 20px; padding: 0.25rem 0.75rem;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="bg-photo" />
      <div className="bg-overlay" />

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.75rem" }}>
          <div className="brand-icon">TC</div>
          <div>
            <div className="brand-name">TCMIT Canteen</div>
            <div className="brand-sub">Tribhuvan College of MIT</div>
          </div>
        </div>

        <div className="food-tags">
          <span className="food-tag">🍱 Fresh Daily</span>
          <span className="food-tag">⚡ Quick Pickup</span>
          <span className="food-tag">🧃 Beverages</span>
        </div>

        <h2 className="heading">Welcome back</h2>
        <p className="subheading">Sign in to order your meal</p>

        {error && <div className="err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>College Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@tcmit.edu.np"
              required autoFocus
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p className="footer-note">🔒 Account created by your college admin</p>
      </div>
    </main>
  );
}
