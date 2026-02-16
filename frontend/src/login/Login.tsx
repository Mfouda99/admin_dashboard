import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


import loginLogo from "../assets/logo.webp";
import loginBg from "../assets/login-logo.png";

export default function Login() {
  const nav = useNavigate();
  const auth = useContext(AuthContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.detail || text || `Login failed (${res.status})`;
        throw new Error(msg);
      }

      if (!data?.access || !data?.role) {
        throw new Error("Invalid login response");
      }

      localStorage.setItem("token", data.access);
      localStorage.setItem("role", data.role);
      localStorage.setItem("coach_id", data.coach_id ?? "");
      localStorage.setItem("username", data.username ?? username);

      auth?.setUser?.({
        username: data.username ?? username,
        role: data.role,
        coach_id: data.coach_id ?? null,
      });

      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex bg-[var(--color16)]">

      {/* LEFT: Form */}
      <div className="w-full lg:w-[46%] flex items-center justify-center px-6 sm:px-10 py-10">
        <form
          onSubmit={onSubmit}
          className="
            w-full max-w-md
            bg-white rounded-2xl
            shadow-[0_20px_60px_rgba(0,0,0,0.08)]
            border border-black/5
            px-8 py-10
          "
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src={loginLogo}
              alt="Kent Business College"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Fields */}
          <div className="space-y-5">
            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--color17)" }}
              >
                Username or email
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={loading}
                className="
                  w-full h-12 rounded-xl px-4
                  border border-black/10
                  bg-[var(--color16)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color11)]
                  focus:border-transparent
                "
              />
            </div>

            <div>
              <label
                className="block text-sm mb-2"
                style={{ color: "var(--color17)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="
                  w-full h-12 rounded-xl px-4
                  border border-black/10
                  bg-[var(--color16)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color11)]
                  focus:border-transparent
                "
              />
            </div>

            {err && (
              <div className="text-sm rounded-xl px-4 py-3 bg-red-50 border border-red-100 text-red-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
    w-full h-12 rounded-xl font-semibold
    text-white bg-[#241453]
    shadow-sm
    transition
    hover:opacity-95
    disabled:opacity-60 disabled:cursor-not-allowed
  "
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </div>
        </form>
      </div>

      {/* RIGHT: Image (No blur) */}
      <div className="hidden lg:block flex-1 relative">
        <img
          src={loginBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Optional very light overlay for readability (مش blur) */}
        <div className="absolute inset-0 bg-black/5" />
      </div>
    </div>
  );
}
