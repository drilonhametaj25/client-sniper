"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Settings,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Trash2,
  Edit2,
  Crown,
  User,
  Building,
  Activity,
  BarChart3,
  Send,
  RefreshCw,
  Copy,
  AlertTriangle,
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  can_view_all_leads: boolean;
  can_export: boolean;
  can_delete: boolean;
  can_invite: boolean;
  can_manage_settings: boolean;
  status: string;
  joined_at: string;
  user?: {
    email: string;
    name: string;
  };
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Team {
  id: string;
  name: string;
  owner_id: string;
  plan: string;
  max_members: number;
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

interface TeamStats {
  totalMembers: number;
  maxMembers: number;
  pendingInvitations: number;
  totalLeads: number;
  assignedLeads: number;
}

export default function TeamPage() {
  const { user, getAccessToken } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTeamData();
    }
  }, [user]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      const response = await fetch("/api/team", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("Team management requires Agency plan");
          return;
        }
        throw new Error("Error loading team data");
      }

      const data = await response.json();
      setTeam(data.team);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
      setStats(data.stats);
      setCurrentUserRole(data.currentUserRole);

      if (data.team) {
        setTeamName(data.team.name);
        setTeamDescription(data.team.description || "");
      }
    } catch (err) {
      console.error("Error loading team:", err);
      setError("Error loading team data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/team", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error creating team");
      }

      setSuccess("Team created successfully!");
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setError("Email is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: team?.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error sending invitation");
      }

      setSuccess("Invitation sent successfully!");
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const token = getAccessToken();
      const response = await fetch(
        `/api/team/members?memberId=${memberId}&teamId=${team?.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error removing member");
      }

      setSuccess("Member removed successfully");
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/team/members", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: selectedMember.id,
          teamId: team?.id,
          permissions: {
            can_view_all_leads: selectedMember.can_view_all_leads,
            can_export: selectedMember.can_export,
            can_delete: selectedMember.can_delete,
            can_invite: selectedMember.can_invite,
            can_manage_settings: selectedMember.can_manage_settings,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error updating permissions");
      }

      setSuccess("Permissions updated successfully");
      setShowPermissionsModal(false);
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/team", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: team?.id,
          name: teamName,
          description: teamDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error updating team");
      }

      setSuccess("Team updated successfully");
      setShowEditModal(false);
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      member: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error === "Team management requires Agency plan") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Building className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Team Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Gestisci il tuo team, assegna lead ai membri e collabora in modo efficace.
          Questa funzionalità è disponibile con il piano Agency.
        </p>
        <button
          onClick={() => router.push("/pricing")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade ad Agency
        </button>
      </div>
    );
  }

  // No team yet - show create team form
  if (!team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <Users className="h-16 w-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Crea il tuo Team
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Inizia a collaborare con il tuo team. Invita membri, assegna lead
            e traccia le performance di tutti.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Team *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Es: Marketing Team"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrizione (opzionale)
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Descrivi il tuo team..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleCreateTeam}
              disabled={isSubmitting || !teamName.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Users className="h-5 w-5" />
              )}
              Crea Team
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600" />
            {team.name}
          </h1>
          {team.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {team.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {["owner", "admin"].includes(currentUserRole) && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Impostazioni
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invita Membro
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMembers}/{stats.maxMembers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Membri</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingInvitations}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inviti Pendenti</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalLeads}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lead Totali</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.assignedLeads}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lead Assegnati</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Membri del Team
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {members.map((member) => (
            <div
              key={member.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  {getRoleIcon(member.role)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.user?.name || member.user?.email || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.user?.email}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                    member.role
                  )}`}
                >
                  {member.role === "owner"
                    ? "Owner"
                    : member.role === "admin"
                    ? "Admin"
                    : "Membro"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {["owner", "admin"].includes(currentUserRole) &&
                  member.role !== "owner" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowPermissionsModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Modifica permessi"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Rimuovi membro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Inviti Pendenti
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="px-6 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invitation.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Scade il{" "}
                      {new Date(invitation.expires_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                      invitation.role
                    )}`}
                  >
                    {invitation.role === "admin" ? "Admin" : "Membro"}
                  </span>
                </div>

                <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                  In attesa
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invita Nuovo Membro
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ruolo
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "member" | "admin")
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleInviteMember}
                disabled={isSubmitting || !inviteEmail.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Invia Invito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Impostazioni Team
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome Team *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleUpdateTeam}
                disabled={isSubmitting || !teamName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Permessi di {selectedMember.user?.name || selectedMember.user?.email}
            </h3>

            <div className="space-y-4">
              {[
                {
                  key: "can_view_all_leads",
                  label: "Visualizza tutti i lead",
                  desc: "Può vedere i lead di tutti i membri",
                },
                {
                  key: "can_export",
                  label: "Esporta dati",
                  desc: "Può esportare lead in CSV/Excel",
                },
                {
                  key: "can_delete",
                  label: "Elimina lead",
                  desc: "Può eliminare lead dal sistema",
                },
                {
                  key: "can_invite",
                  label: "Invita membri",
                  desc: "Può invitare nuovi membri nel team",
                },
                {
                  key: "can_manage_settings",
                  label: "Gestisci impostazioni",
                  desc: "Può modificare le impostazioni del team",
                },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedMember[perm.key as keyof TeamMember] as boolean}
                    onChange={(e) =>
                      setSelectedMember({
                        ...selectedMember,
                        [perm.key]: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {perm.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {perm.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annulla
              </button>
              <button
                onClick={handleUpdatePermissions}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Salva Permessi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
