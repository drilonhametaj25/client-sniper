"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Clock,
  Activity,
  Settings,
  Code,
  Zap,
  Lock,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key?: string; // Solo alla creazione
  permissions: {
    read: boolean;
    write: boolean;
  };
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  total_requests: number;
  created_at: string;
  expires_at: string | null;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string; // Solo alla creazione
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { id: "lead.unlocked", label: "Lead Sbloccato", desc: "Quando un lead viene sbloccato" },
  { id: "crm.status_changed", label: "Status CRM Cambiato", desc: "Quando lo status CRM di un lead cambia" },
  { id: "crm.follow_up_due", label: "Follow-up Scaduto", desc: "Quando un follow-up scade" },
  { id: "report.generated", label: "Report Generato", desc: "Quando un report PDF viene generato" },
  { id: "email.sent", label: "Email Inviata", desc: "Quando un'email di outreach viene inviata" },
  { id: "email.opened", label: "Email Aperta", desc: "Quando un'email viene aperta" },
];

export default function ApiSettingsPage() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"keys" | "webhooks">("keys");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState({ read: true, write: false });
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [showCreateWebhookModal, setShowCreateWebhookModal] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(["lead.unlocked"]);
  const [createdWebhook, setCreatedWebhook] = useState<WebhookConfig | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();

      // Load API keys
      const keysResponse = await fetch("/api/settings/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (keysResponse.status === 403) {
        setError("API access requires Pro or Agency plan");
        setLoading(false);
        return;
      }

      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setApiKeys(keysData.apiKeys || []);
      }

      // Load webhooks
      const webhooksResponse = await fetch("/api/settings/webhooks", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json();
        setWebhooks(webhooksData.webhooks || []);
        setAvailableEvents(webhooksData.availableEvents || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      setError("API key name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: newKeyPermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error creating API key");
      }

      const data = await response.json();
      setCreatedKey(data.apiKey);
      setNewKeyName("");
      setNewKeyPermissions({ read: true, write: false });
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(`/api/settings/api-keys?keyId=${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Error revoking API key");
      }

      setSuccess("API key revoked successfully");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || newWebhookEvents.length === 0) {
      setError("Name, URL, and at least one event are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newWebhookName,
          url: newWebhookUrl,
          events: newWebhookEvents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error creating webhook");
      }

      const data = await response.json();
      setCreatedWebhook(data.webhook);
      setNewWebhookName("");
      setNewWebhookUrl("");
      setNewWebhookEvents(["lead.unlocked"]);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const token = getAccessToken();
      const response = await fetch("/api/settings/webhooks", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookId,
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Error updating webhook");
      }

      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    try {
      const token = getAccessToken();
      const response = await fetch(`/api/settings/webhooks?webhookId=${webhookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Error deleting webhook");
      }

      setSuccess("Webhook deleted successfully");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = async (text: string, type: "key" | "secret") => {
    await navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error === "API access requires Pro or Agency plan") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Lock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          API & Webhooks
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Integra TrovaMi.pro con i tuoi sistemi usando le API o ricevi notifiche
          in tempo reale con i webhooks. Disponibile con piano Pro o Agency.
        </p>
        <button
          onClick={() => router.push("/pricing")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade a Pro
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Code className="h-7 w-7 text-blue-600" />
          API & Webhooks
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gestisci le tue API keys e configura webhooks per integrazioni esterne.
        </p>
      </div>

      {/* Alerts */}
      {error && error !== "API access requires Pro or Agency plan" && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("keys")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "keys"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Key className="h-4 w-4 inline mr-2" />
          API Keys
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "webhooks"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Webhook className="h-4 w-4 inline mr-2" />
          Webhooks
        </button>
      </div>

      {/* API Keys Tab */}
      {activeTab === "keys" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Usa le API keys per accedere ai tuoi dati programmaticamente.
            </p>
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuova API Key
            </button>
          </div>

          {/* API Keys List */}
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Key className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Non hai ancora creato nessuna API key.
                </p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {key.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {key.key_prefix}...
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeApiKey(key.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Revoca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Activity className="h-4 w-4" />
                      {key.total_requests} richieste
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Zap className="h-4 w-4" />
                      {key.rate_limit} req/min
                    </div>
                    {key.last_used_at && (
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        Ultimo uso:{" "}
                        {new Date(key.last_used_at).toLocaleDateString("it-IT")}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {key.permissions.read && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                        Read
                      </span>
                    )}
                    {key.permissions.write && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                        Write
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* API Documentation Link */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Documentazione API
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Endpoint disponibili:
            </p>
            <ul className="text-sm font-mono space-y-1 text-gray-700 dark:text-gray-300">
              <li>GET /api/public/leads - Lista lead sbloccati</li>
              <li>GET /api/public/leads/:id - Dettaglio lead</li>
              <li>PUT /api/public/leads/:id - Aggiorna CRM status</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Usa header: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">x-api-key: YOUR_KEY</code>
            </p>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Ricevi notifiche in tempo reale quando si verificano eventi.
            </p>
            <button
              onClick={() => setShowCreateWebhookModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuovo Webhook
            </button>
          </div>

          {/* Webhooks List */}
          <div className="space-y-4">
            {webhooks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Webhook className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Non hai ancora configurato nessun webhook.
                </p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          webhook.is_active ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {webhook.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                          {webhook.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleWebhook(webhook.id, !webhook.is_active)
                        }
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          webhook.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {webhook.is_active ? "Attivo" : "Disattivo"}
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-600">
                      {webhook.success_count} successi
                    </span>
                    <span className="text-red-600">
                      {webhook.failure_count} errori
                    </span>
                    {webhook.last_triggered_at && (
                      <span>
                        Ultimo trigger:{" "}
                        {new Date(webhook.last_triggered_at).toLocaleString("it-IT")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            {createdKey ? (
              <>
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API Key Creata!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Copia questa key ora. Non potrai vederla di nuovo.
                  </p>
                </div>

                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono break-all">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey.key!, "key")}
                      className="ml-2 p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      {copiedKey ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCreateKeyModal(false);
                    setCreatedKey(null);
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ho copiato la key
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Crea Nuova API Key
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Es: Production Key"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permessi
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newKeyPermissions.read}
                          onChange={(e) =>
                            setNewKeyPermissions({
                              ...newKeyPermissions,
                              read: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Read (visualizza lead)
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newKeyPermissions.write}
                          onChange={(e) =>
                            setNewKeyPermissions({
                              ...newKeyPermissions,
                              write: e.target.checked,
                            })
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Write (aggiorna CRM)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateKeyModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateApiKey}
                    disabled={isSubmitting || !newKeyName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Crea API Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            {createdWebhook ? (
              <>
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Webhook Creato!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Copia il secret per verificare le richieste.
                  </p>
                </div>

                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Webhook Secret
                  </p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono break-all">
                      {createdWebhook.secret}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(createdWebhook.secret!, "secret")
                      }
                      className="ml-2 p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      {copiedSecret ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCreateWebhookModal(false);
                    setCreatedWebhook(null);
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ho copiato il secret
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Crea Nuovo Webhook
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      placeholder="Es: CRM Sync"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      URL Endpoint *
                    </label>
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://api.example.com/webhook"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Eventi
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {AVAILABLE_EVENTS.map((event) => (
                        <label
                          key={event.id}
                          className="flex items-start gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <input
                            type="checkbox"
                            checked={newWebhookEvents.includes(event.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewWebhookEvents([...newWebhookEvents, event.id]);
                              } else {
                                setNewWebhookEvents(
                                  newWebhookEvents.filter((e) => e !== event.id)
                                );
                              }
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {event.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {event.desc}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateWebhookModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateWebhook}
                    disabled={
                      isSubmitting ||
                      !newWebhookName.trim() ||
                      !newWebhookUrl.trim() ||
                      newWebhookEvents.length === 0
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Crea Webhook
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
