import { Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

import DashboardLayout from "@/layouts/DashboardLayout";

import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Conversations from "@/pages/Conversations";
import Channels from "@/pages/Channels";
import Team from "@/pages/Team";
import FunnelKanban from "@/pages/FunnelKanban";
import Settings from "@/pages/Settings";

function Login() {
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();

    const form = new FormData(e.target);
    const email = form.get("email");
    const password = form.get("password");

    const { error } = await login(email, password);

    if (error) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md border border-zinc-900 bg-zinc-950 rounded-3xl p-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2">
          MAX <span className="text-yellow-500">RCM</span>
        </h1>

        <p className="text-zinc-500 mb-8">CRM Multiatendimento Premium</p>

        <input
          name="email"
          type="email"
          placeholder="Seu email"
          className="w-full p-4 rounded-xl bg-zinc-900 text-white mb-4 outline-none"
        />

        <input
          name="password"
          type="password"
          placeholder="Sua senha"
          className="w-full p-4 rounded-xl bg-zinc-900 text-white mb-6 outline-none"
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-400 transition text-black font-bold p-4 rounded-xl"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/funnel" element={<FunnelKanban />} />
        <Route path="/team" element={<Team />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}