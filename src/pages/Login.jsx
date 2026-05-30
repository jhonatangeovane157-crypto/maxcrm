import { Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

import DashboardLayout from "@/layouts/DashboardLayout";

import Login from "@/pages/Login";

function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">
        Dashboard <span className="gold-text">MAX RCM</span>
      </h1>

      <div className="grid grid-cols-4 gap-4 mt-8">
        <div className="glass-card-gold rounded-2xl p-6">
          <p className="text-muted text-sm">Atendimentos</p>
          <h2 className="text-4xl font-bold mt-2">24</h2>
        </div>

        <div className="glass-card-gold rounded-2xl p-6">
          <p className="text-muted text-sm">Canais</p>
          <h2 className="text-4xl font-bold mt-2">4</h2>
        </div>

        <div className="glass-card-gold rounded-2xl p-6">
          <p className="text-muted text-sm">Equipe</p>
          <h2 className="text-4xl font-bold mt-2">8</h2>
        </div>

        <div className="glass-card-gold rounded-2xl p-6">
          <p className="text-muted text-sm">IA Ativa</p>
          <h2 className="text-4xl font-bold mt-2 text-gold-400">
            ON
          </h2>
        </div>
      </div>
    </div>
  );
}

function EmptyPage({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">
        {title}
      </h1>

      <p className="text-muted mt-3">
        Página em construção.
      </p>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/conversations" element={<EmptyPage title="Conversas" />} />
        <Route path="/customers" element={<EmptyPage title="Clientes" />} />
        <Route path="/team" element={<EmptyPage title="Equipe" />} />
        <Route path="/channels" element={<EmptyPage title="Canais" />} />
        <Route path="/settings" element={<EmptyPage title="Configurações" />} />
      </Route>
    </Routes>
  );
}