import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Crown,
  LayoutDashboard,
  MessageSquare,
  Users,
  UserCog,
  Radio,
  Settings,
  LogOut,
  GitBranch,
  Bell,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const menu = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Conversas", path: "/conversations", icon: MessageSquare },
  { label: "Funil", path: "/funnel", icon: GitBranch },
  { label: "Clientes", path: "/customers", icon: Users },
  { label: "Equipe", path: "/team", icon: UserCog },
  { label: "Canais", path: "/channels", icon: Radio },
  { label: "Configurações", path: "/settings", icon: Settings },
];

function getRoleLabel(role) {
  const roles = {
    admin: "Admin",
    supervisor: "Supervisor",
    seller: "Vendedor",
  };

  return roles[role] || "Sem cargo definido";
}

let urgentAudioInterval = null;

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.22, audioContext.currentTime);

    oscillator.start();

    setTimeout(() => {
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    }, 180);

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 700);
  } catch (error) {
    console.log("Som bloqueado pelo navegador.");
  }
}

function playUrgentAlarm() {
  stopUrgentAlarm();

  urgentAudioInterval = setInterval(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      gain.gain.setValueAtTime(0.45, audioContext.currentTime);

      oscillator.start();

      setTimeout(() => {
        oscillator.frequency.setValueAtTime(760, audioContext.currentTime);
      }, 220);

      setTimeout(() => {
        oscillator.frequency.setValueAtTime(1350, audioContext.currentTime);
      }, 420);

      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 800);
    } catch (error) {
      console.log("Som bloqueado pelo navegador.");
    }
  }, 950);
}

function stopUrgentAlarm() {
  if (urgentAudioInterval) {
    clearInterval(urgentAudioInterval);
    urgentAudioInterval = null;
  }
}

export default function DashboardLayout() {
  const location = useLocation();
  const { user, member, logout, canAccess } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);

  const visibleMenu = menu.filter((item) => canAccess(item.path));
  const unreadCount = notifications.filter((item) => !item.read).length;

  async function loadNotifications() {
    if (!member?.id) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("member_id", member.id)
      .eq("read", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setNotifications(data || []);

    if (data?.length) {
      setActiveNotification(data[0]);

      if (data[0].priority === "urgent") {
        playUrgentAlarm();
      } else if (data[0].priority === "priority") {
        playAlertSound();
      }
    }
  }

  async function markAsRead(notificationId) {
    stopUrgentAlarm();

    if (!notificationId) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((current) =>
      current.filter((item) => item.id !== notificationId)
    );

    setActiveNotification(null);
  }

  useEffect(() => {
    loadNotifications();
  }, [member?.id]);

  useEffect(() => {
    if (!member?.id) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 3000);

    return () => clearInterval(interval);
  }, [member?.id]);

  useEffect(() => {
    if (!member?.id) return;

    const channel = supabase
      .channel(`notifications-${member.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          const notification = payload.new;

          setNotifications((current) => [notification, ...current]);
          setActiveNotification(notification);

          if (notification.priority === "urgent") {
            playUrgentAlarm();
          } else if (notification.priority === "priority") {
            playAlertSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [member?.id]);

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="w-72 bg-[#070707] border-r border-zinc-900 flex flex-col">
        <div className="p-6 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl glass-card-gold flex items-center justify-center">
              <Crown className="text-yellow-500" />
            </div>

            <div>
              <h1 className="font-bold text-lg">
                MAX <span className="gold-text">RCM</span>
              </h1>
              <p className="text-xs text-zinc-500">Multiatendimento IA</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  active
                    ? "glass-card-gold text-yellow-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={loadNotifications}
            className="w-full mb-3 flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
          >
            <span className="flex items-center gap-2 text-sm">
              <Bell size={17} className="text-yellow-500" />
              Notificações
            </span>

            <span className="bg-yellow-500 text-black text-xs font-bold rounded-full px-2 py-1">
              {unreadCount}
            </span>
          </button>

          <div className="glass-card-gold rounded-2xl p-4 mb-3">
            <p className="text-xs text-zinc-500">Logado como</p>
            <p className="text-sm font-semibold truncate">{user?.email}</p>

            <div className="mt-3 inline-flex px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold">
              {getRoleLabel(member?.role)}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {activeNotification && activeNotification.priority !== "urgent" && (
        <div className="fixed right-6 bottom-6 z-50 w-[360px] bg-zinc-950 border border-yellow-500/30 rounded-3xl p-5 shadow-2xl shadow-black">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                {activeNotification.priority === "priority" ? (
                  <AlertTriangle className="text-yellow-500" />
                ) : (
                  <Bell className="text-yellow-500" />
                )}
              </div>

              <div>
                <h3 className="font-bold">{activeNotification.title}</h3>
                <p className="text-xs text-zinc-500">
                  {activeNotification.priority === "priority"
                    ? "Prioridade"
                    : "Notificação"}
                </p>
              </div>
            </div>

            <button
              onClick={() => markAsRead(activeNotification.id)}
              className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-sm text-zinc-300 mt-4 leading-relaxed">
            {activeNotification.message}
          </p>

          <button
            onClick={() => markAsRead(activeNotification.id)}
            className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl"
          >
            Entendi
          </button>
        </div>
      )}

      {activeNotification && activeNotification.priority === "urgent" && (
        <div className="fixed inset-0 z-[999] bg-red-950/95 flex items-center justify-center animate-pulse">
          <div className="w-full max-w-xl bg-black border-2 border-red-500 rounded-3xl p-8 text-center shadow-2xl shadow-red-900">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-5">
              <AlertTriangle className="text-red-400" size={44} />
            </div>

            <h1 className="text-4xl font-black text-red-400 mb-3">
              URGENTE
            </h1>

            <h2 className="text-2xl font-bold mb-4">
              {activeNotification.title}
            </h2>

            <p className="text-zinc-300 leading-relaxed text-lg">
              {activeNotification.message}
            </p>

            <button
              onClick={() => markAsRead(activeNotification.id)}
              className="mt-8 w-full bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-xl text-lg"
            >
              ENTENDI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}