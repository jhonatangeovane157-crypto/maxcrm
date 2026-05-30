import { useEffect, useMemo, useState } from "react";
import {
  Wifi,
  WifiOff,
  Plus,
  Smartphone,
  Globe,
  QrCode,
  RefreshCw,
  Settings,
  MessageCircle,
  X,
  Power,
  PowerOff,
  Copy,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const DEFAULT_EVOLUTION_URL =
  import.meta.env.VITE_EVOLUTION_URL ||
  "https://evolution.srv1715736.hstgr.cloud";

const DEFAULT_INSTANCE_NAME = "teste02";
const DEFAULT_EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || "";

function normalizeBaseUrl(url) {
  return (url || DEFAULT_EVOLUTION_URL).replace(/\/$/, "");
}

function normalizeQrImage(base64) {
  if (!base64) return "";
  if (base64.startsWith("data:image")) return base64;
  return `data:image/png;base64,${base64}`;
}

function getEvolutionConfig(channel) {
  return {
    baseUrl: normalizeBaseUrl(channel?.base_url),
    apiKey: channel?.api_key || DEFAULT_EVOLUTION_API_KEY,
    instanceName: channel?.instance_name || DEFAULT_INSTANCE_NAME,
  };
}

async function evolutionRequest(channel, path, method = "GET", body = null) {
  const { baseUrl, apiKey } = getEvolutionConfig(channel);

  if (!baseUrl) {
    throw new Error("Base URL da Evolution API não configurada.");
  }

  if (!apiKey) {
    throw new Error("API Key da Evolution não configurada.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Evolution API erro ${response.status}: ${text}`);
  }

  return response.json();
}

function mapEvolutionState(state) {
  if (state === "open") return "connected";
  if (state === "connecting") return "connecting";
  if (state === "close") return "disconnected";
  return state || "disconnected";
}

function getEvolutionState(data) {
  return (
    data?.instance?.state ||
    data?.state ||
    data?.connectionState ||
    data?.status ||
    "close"
  );
}


const futureChannels = [
  {
    type: "instagram",
    name: "Instagram",
    icon: MessageCircle,
    description: "Mensagens diretas do Instagram.",
  },
  {
    type: "facebook",
    name: "Facebook Messenger",
    icon: MessageCircle,
    description: "Mensagens do Facebook Messenger.",
  },
  {
    type: "webchat",
    name: "Bate-papo online",
    icon: Globe,
    description: "Chat para instalar no site.",
  },
];

function emptyForm() {
  return {
    name: "",
    phone_number: "",
    instance_name: "",
    base_url: "",
    api_key: "",
    api_token: "",
    webhook_url: "",
  };
}

function statusLabel(status) {
  if (status === "connected") return "Conectado";
  if (status === "connecting") return "Conectando";
  if (status === "qr_pending") return "Aguardando QR";
  if (status === "error") return "Erro";
  return "Desconectado";
}

function formatDate(date) {
  if (!date) return "Nunca";

  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm());

  async function loadChannels() {
    setLoading(true);

    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar canais.");
    } else {
      setChannels(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (!qrModalOpen || !selectedChannel) return;

    const interval = setInterval(() => {
      checkEvolutionStatus(selectedChannel, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [qrModalOpen, selectedChannel]);

  const whatsappChannels = channels.filter(
    (channel) => channel.type === "whatsapp"
  );

  const stats = useMemo(() => {
    const connected = whatsappChannels.filter(
      (item) =>
        item.status === "connected" || item.connection_status === "connected"
    ).length;

    const disconnected = whatsappChannels.length - connected;

    return {
      total: whatsappChannels.length,
      connected,
      disconnected,
    };
  }, [whatsappChannels]);

  function openModal() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openConfig(channel) {
    setSelectedChannel(channel);
    setForm({
      name: channel.name || "",
      phone_number: channel.phone_number || "",
      instance_name: channel.instance_name || "",
      base_url: channel.base_url || "",
      api_key: channel.api_key || "",
      api_token: channel.api_token || "",
      webhook_url: channel.webhook_url || "",
    });
    setConfigModalOpen(true);
  }

  function closeConfig() {
    setConfigModalOpen(false);
    setSelectedChannel(null);
    setForm(emptyForm());
  }

  function openQr(channel) {
    setSelectedChannel(channel);
    setQrModalOpen(true);
  }

  function closeQr() {
    setQrModalOpen(false);
    setSelectedChannel(null);
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((old) => ({
      ...old,
      [name]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Digite o nome do WhatsApp.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("channels").insert({
      name: form.name,
      type: "whatsapp",
      phone_number: form.phone_number || null,
      instance_name: form.instance_name || null,
      base_url: form.base_url || null,
      api_key: form.api_key || null,
      api_token: form.api_token || null,
      webhook_url: form.webhook_url || null,
      status: "disconnected",
      connection_status: "disconnected",
      qr_code: null,
      last_connection_at: null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Erro ao salvar canal.");
      return;
    }

    closeModal();
    loadChannels();
  }

  async function handleUpdate(e) {
    e.preventDefault();

    if (!selectedChannel?.id) return;

    if (!form.name.trim()) {
      alert("Digite o nome do WhatsApp.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("channels")
      .update({
        name: form.name,
        phone_number: form.phone_number || null,
        instance_name: form.instance_name || null,
        base_url: form.base_url || null,
        api_key: form.api_key || null,
        api_token: form.api_token || null,
        webhook_url: form.webhook_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedChannel.id);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Erro ao atualizar canal.");
      return;
    }

    closeConfig();
    loadChannels();
  }

  async function checkEvolutionStatus(channel, shouldReload = true) {
    try {
      const { instanceName } = getEvolutionConfig(channel);
      const data = await evolutionRequest(
        channel,
        `/api/v1/instance/connectionState/${instanceName}`
      );

      const evolutionState = getEvolutionState(data);
      const crmStatus = mapEvolutionState(evolutionState);

      const updatePayload = {
        status: crmStatus,
        connection_status: crmStatus,
        updated_at: new Date().toISOString(),
      };

      if (crmStatus === "connected") {
        updatePayload.last_connection_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("channels")
        .update(updatePayload)
        .eq("id", channel.id);

      if (error) throw error;

      const updatedChannel = {
        ...channel,
        ...updatePayload,
      };

      setSelectedChannel((current) =>
        current?.id === channel.id ? { ...current, ...updatedChannel } : current
      );

      if (shouldReload) await loadChannels();

      return crmStatus;
    } catch (error) {
      console.error(error);

      await supabase
        .from("channels")
        .update({
          status: "error",
          connection_status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", channel.id);

      alert(error.message || "Erro ao consultar status da Evolution API.");
      return "error";
    }
  }

  async function connectWhatsApp(channel) {
    try {
      const { instanceName, baseUrl, apiKey } = getEvolutionConfig(channel);

      const channelWithConfig = {
        ...channel,
        base_url: channel.base_url || baseUrl,
        api_key: channel.api_key || apiKey,
        instance_name: channel.instance_name || instanceName,
      };

      const data = await evolutionRequest(
        channelWithConfig,
        `/api/v1/instance/connect/${instanceName}`
      );

      const qrCode = normalizeQrImage(data?.base64 || data?.qrcode || data?.qr || "");

      const { error } = await supabase
        .from("channels")
        .update({
          base_url: channelWithConfig.base_url,
          api_key: channelWithConfig.api_key,
          instance_name: channelWithConfig.instance_name,
          status: "qr_pending",
          connection_status: "qr_pending",
          qr_code: qrCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", channel.id);

      if (error) throw error;

      const updatedChannel = {
        ...channelWithConfig,
        status: "qr_pending",
        connection_status: "qr_pending",
        qr_code: qrCode,
      };

      await loadChannels();
      openQr(updatedChannel);
      checkEvolutionStatus(updatedChannel, false);
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao gerar QR Code da Evolution API.");
    }
  }

  async function markConnected(channel) {
    const { error } = await supabase
      .from("channels")
      .update({
        status: "connected",
        connection_status: "connected",
        last_connection_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", channel.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadChannels();
  }

  async function disconnect(channel) {
    const { error } = await supabase
      .from("channels")
      .update({
        status: "disconnected",
        connection_status: "disconnected",
        qr_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", channel.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadChannels();
  }

  async function copyWebhook(channel) {
    const text = channel.webhook_url || "Webhook ainda não configurado.";
    await navigator.clipboard.writeText(text);
    alert("Webhook copiado.");
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Canais</h1>
          <p className="text-zinc-500 mt-2">
            Gerencie múltiplos WhatsApps e prepare a integração Evolution API.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadChannels}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-3 rounded-xl transition"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>

          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl transition"
          >
            <Plus size={18} />
            Adicionar WhatsApp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 mb-8">
        <MetricCard title="WhatsApps" value={stats.total} icon={Smartphone} />
        <MetricCard title="Conectados" value={stats.connected} icon={Wifi} />
        <MetricCard
          title="Desconectados"
          value={stats.disconnected}
          icon={WifiOff}
        />
        <MetricCard title="Pronto para API" value="Sim" icon={ShieldCheck} />
      </div>

      <div className="mb-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
          <AlertCircle size={24} />
        </div>

        <div>
          <h2 className="font-bold text-yellow-500">Evolution API conectada ao MAX CRM</h2>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
            Esta tela usa a Evolution API diretamente, sem depender do Evolution Manager.
            Clique em Conectar para gerar o QR Code real da instância e acompanhar
            o status automaticamente.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-500">Carregando canais...</div>
      ) : (
        <>
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Smartphone size={23} />
              </div>

              <div>
                <h2 className="text-2xl font-bold">WhatsApps conectados</h2>
                <p className="text-zinc-500 text-sm">
                  Cadastre vendas, suporte, financeiro e outros números.
                </p>
              </div>
            </div>

            {whatsappChannels.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center">
                <p className="text-zinc-400 mb-5">
                  Nenhum WhatsApp cadastrado ainda.
                </p>

                <button
                  onClick={openModal}
                  className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl transition"
                >
                  <Plus size={18} />
                  Adicionar primeiro WhatsApp
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {whatsappChannels.map((channel) => (
                  <WhatsappCard
                    key={channel.id}
                    channel={channel}
                    onConnect={() => connectWhatsApp(channel)}
                    onMarkConnected={() => markConnected(channel)}
                    onDisconnect={() => disconnect(channel)}
                    onQr={() => openQr(channel)}
                    onConfig={() => openConfig(channel)}
                    onCopyWebhook={() => copyWebhook(channel)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-5">Outros canais</h2>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {futureChannels.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.type}
                    className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 opacity-80"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                          <Icon size={26} />
                        </div>

                        <div>
                          <h3 className="text-xl font-bold">{item.name}</h3>
                          <p className="text-zinc-500 text-sm mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status="soon" />
                    </div>

                    <Info label="Nome" value={item.name} />
                    <Info label="Tipo" value={item.name} />
                    <Info label="Status" value="Em breve" />

                    <button className="mt-6 flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl text-zinc-400 cursor-not-allowed">
                      <Settings size={17} />
                      Em breve
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {modalOpen && (
        <ChannelModal
          title="Adicionar WhatsApp"
          subtitle="Cadastre um novo número para atendimento."
          form={form}
          saving={saving}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSave}
          submitLabel="Salvar WhatsApp"
        />
      )}

      {configModalOpen && (
        <ChannelModal
          title="Configurar WhatsApp"
          subtitle="Ajuste instância, URL, API Key e webhook."
          form={form}
          saving={saving}
          onChange={handleChange}
          onClose={closeConfig}
          onSubmit={handleUpdate}
          submitLabel="Salvar configurações"
        />
      )}

      {qrModalOpen && selectedChannel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-5">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">QR Code</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Instância: {selectedChannel.instance_name || "Não configurada"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeQr}
                className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-3xl bg-black border border-zinc-800 p-8 text-center">
              {(selectedChannel.connection_status || selectedChannel.status) === "connected" && (
                <div className="mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 font-bold">
                  WhatsApp conectado com sucesso
                </div>
              )}

              {selectedChannel.qr_code ? (
                <div>
                  <div className="w-64 h-64 mx-auto bg-white rounded-2xl flex items-center justify-center text-black p-4">
                    <img
                      src={selectedChannel.qr_code}
                      alt="QR Code WhatsApp"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="text-sm text-zinc-400 mt-5">
                    Escaneie este QR Code no WhatsApp. O status atualiza automaticamente a cada 5 segundos.
                  </p>
                </div>
              ) : (
                <div className="py-8">
                  <QrCode className="mx-auto text-zinc-600 mb-4" size={96} />
                  <p className="text-zinc-500">
                    Clique em conectar para preparar o QR Code.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={closeQr}
              className="mt-6 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsappCard({
  channel,
  onConnect,
  onMarkConnected,
  onDisconnect,
  onQr,
  onConfig,
  onCopyWebhook,
}) {
  const status = channel.connection_status || channel.status || "disconnected";
  const isConnected = status === "connected";
  const isPending = status === "qr_pending" || status === "connecting";

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 hover:border-yellow-500/40 transition">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
            <Smartphone size={26} />
          </div>

          <div>
            <h3 className="text-xl font-bold">{channel.name}</h3>
            <p className="text-zinc-500 text-sm mt-1">
              Atendimento via WhatsApp com Evolution API.
            </p>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="space-y-3">
        <Info label="Nome" value={channel?.name || "Sem nome"} />
        <Info label="Tipo" value="WhatsApp" />
        <Info
          label="Instância"
          value={channel?.instance_name || "Não configurada"}
        />
        <Info
          label="Número"
          value={channel?.phone_number || "Aguardando conexão"}
        />
        <Info label="Base URL" value={channel?.base_url || "Não configurada"} />
        <Info label="Webhook" value={channel?.webhook_url || "Não configurado"} />
        <Info label="Status" value={statusLabel(status)} />
        <Info
          label="Última conexão"
          value={formatDate(channel.last_connection_at)}
        />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        {!isConnected && (
          <button
            onClick={onConnect}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl transition"
          >
            <Power size={17} />
            Conectar
          </button>
        )}

        {isPending && (
          <button
            onClick={onMarkConnected}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-3 rounded-xl transition"
          >
            <CheckCircle2 size={17} />
            Marcar conectado
          </button>
        )}

        {isConnected && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl transition"
          >
            <PowerOff size={17} />
            Desconectar
          </button>
        )}

        <button
          onClick={onQr}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-3 rounded-xl transition"
        >
          <QrCode size={17} />
          Código QR
        </button>

        <button
          onClick={onConfig}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-3 rounded-xl transition"
        >
          <Settings size={17} />
          Configurar
        </button>

        <button
          onClick={onCopyWebhook}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-3 rounded-xl transition"
        >
          <Copy size={17} />
          Webhook
        </button>
      </div>
    </div>
  );
}

function ChannelModal({
  title,
  subtitle,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
  submitLabel,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-auto pr-1">
          <Input
            label="Nome do canal"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Ex: WhatsApp Vendas"
          />

          <Input
            label="Número"
            name="phone_number"
            value={form.phone_number}
            onChange={onChange}
            placeholder="Ex: 61999999999"
          />

          <Input
            label="Nome da instância"
            name="instance_name"
            value={form.instance_name}
            onChange={onChange}
            placeholder="Ex: maxrcm-vendas"
          />

          <Input
            label="Base URL da Evolution API"
            name="base_url"
            value={form.base_url}
            onChange={onChange}
            placeholder="Ex: https://evolution.seudominio.com"
          />

          <Input
            label="API Key da Evolution"
            name="api_key"
            value={form.api_key}
            onChange={onChange}
            placeholder="Cole a API Key aqui"
          />

          <Input
            label="Token legado / opcional"
            name="api_token"
            value={form.api_token}
            onChange={onChange}
            placeholder="Opcional"
          />

          <Input
            label="Webhook URL"
            name="webhook_url"
            value={form.webhook_url}
            onChange={onChange}
            placeholder="Ex: https://seusite.com/webhook"
          />
        </div>

        <div className="flex justify-end gap-3 mt-7">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold disabled:opacity-60"
          >
            {saving ? "Salvando..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 hover:border-yellow-500/30 transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-500 text-sm">{title}</p>
          <h2 className="text-3xl font-bold mt-1">{value}</h2>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    connected: "bg-emerald-500/10 text-emerald-400",
    connecting: "bg-yellow-500/10 text-yellow-400",
    qr_pending: "bg-yellow-500/10 text-yellow-400",
    error: "bg-red-500/10 text-red-400",
    disconnected: "bg-zinc-900 text-zinc-500",
    soon: "bg-zinc-900 text-zinc-500",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold ${
        classes[status] || classes.disconnected
      }`}
    >
      {status === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
      {status === "soon" ? "Em breve" : statusLabel(status)}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 pb-3 gap-4">
      <span className="text-zinc-500 text-sm shrink-0">{label}</span>
      <span className="text-sm font-medium text-right truncate">{value}</span>
    </div>
  );
}

function Input({ label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 mb-2">{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-black border border-zinc-800 focus:border-yellow-500 outline-none rounded-xl px-4 py-3 text-white"
      />
    </div>
  );
}
