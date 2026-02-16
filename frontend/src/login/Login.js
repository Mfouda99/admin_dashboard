import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);
    async function onSubmit(e) {
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
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            }
            catch {
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
        }
        catch (e) {
            setErr(e?.message || "Login failed");
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "fixed inset-0 flex bg-[var(--color16)]", children: [_jsx("div", { className: "w-full lg:w-[46%] flex items-center justify-center px-6 sm:px-10 py-10", children: _jsxs("form", { onSubmit: onSubmit, className: "\r\n            w-full max-w-md\r\n            bg-white rounded-2xl\r\n            shadow-[0_20px_60px_rgba(0,0,0,0.08)]\r\n            border border-black/5\r\n            px-8 py-10\r\n          ", children: [_jsx("div", { className: "flex items-center justify-center mb-8", children: _jsx("img", { src: loginLogo, alt: "Kent Business College", className: "h-12 w-auto object-contain" }) }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-2", style: { color: "var(--color17)" }, children: "Username or email" }), _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), autoComplete: "username", disabled: loading, className: "\r\n                  w-full h-12 rounded-xl px-4\r\n                  border border-black/10\r\n                  bg-[var(--color16)]\r\n                  focus:outline-none focus:ring-2 focus:ring-[var(--color11)]\r\n                  focus:border-transparent\r\n                " })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm mb-2", style: { color: "var(--color17)" }, children: "Password" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", disabled: loading, className: "\r\n                  w-full h-12 rounded-xl px-4\r\n                  border border-black/10\r\n                  bg-[var(--color16)]\r\n                  focus:outline-none focus:ring-2 focus:ring-[var(--color11)]\r\n                  focus:border-transparent\r\n                " })] }), err && (_jsx("div", { className: "text-sm rounded-xl px-4 py-3 bg-red-50 border border-red-100 text-red-700", children: err })), _jsx("button", { type: "submit", disabled: loading, className: "\r\n    w-full h-12 rounded-xl font-semibold\r\n    text-white bg-[#241453]\r\n    shadow-sm\r\n    transition\r\n    hover:opacity-95\r\n    disabled:opacity-60 disabled:cursor-not-allowed\r\n  ", children: loading ? "Signing in..." : "Sign in" })] })] }) }), _jsxs("div", { className: "hidden lg:block flex-1 relative", children: [_jsx("img", { src: loginBg, alt: "", className: "absolute inset-0 w-full h-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-black/5" })] })] }));
}
