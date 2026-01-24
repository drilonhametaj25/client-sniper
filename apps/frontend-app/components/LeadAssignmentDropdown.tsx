"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  UserPlus,
  Check,
  ChevronDown,
  X,
  RefreshCw,
  Users,
  Crown,
  Shield,
} from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface LeadAssignmentDropdownProps {
  leadId: string;
  currentAssignee?: string | null;
  teamId?: string | null;
  onAssign?: (assigneeId: string | null) => void;
}

export default function LeadAssignmentDropdown({
  leadId,
  currentAssignee,
  teamId,
  onAssign,
}: LeadAssignmentDropdownProps) {
  const { user, getAccessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(
    currentAssignee || null
  );
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(teamId || null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && members.length === 0) {
      loadTeamMembers();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTeamMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch("/api/team", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError("Team features require Agency plan");
          return;
        }
        throw new Error("Error loading team");
      }

      const data = await response.json();
      if (data.team) {
        setCurrentTeamId(data.team.id);
        setMembers(data.members || []);
      } else {
        setError("No team found");
      }
    } catch (err) {
      console.error("Error loading team members:", err);
      setError("Error loading team");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (memberId: string | null) => {
    if (!currentTeamId) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();

      if (memberId) {
        // Assign lead
        const response = await fetch("/api/team/assignments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId,
            assignedTo: memberId,
            teamId: currentTeamId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Error assigning lead");
        }

        setSelectedAssignee(memberId);
        onAssign?.(memberId);
      } else {
        // TODO: Implement unassign
        setSelectedAssignee(null);
        onAssign?.(null);
      }

      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAssigneeName = () => {
    if (!selectedAssignee) return null;
    const member = members.find((m) => m.user_id === selectedAssignee);
    return member?.user?.name || member?.user?.email || "Assegnato";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case "admin":
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          selectedAssignee
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400"
        }`}
      >
        {selectedAssignee ? (
          <>
            <User className="h-4 w-4" />
            <span className="text-sm">{getAssigneeName()}</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span className="text-sm">Assegna</span>
          </>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2">
              Assegna a un membro del team
            </p>
          </div>

          {loading ? (
            <div className="p-4 text-center">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-500">{error}</div>
          ) : members.length === 0 ? (
            <div className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nessun membro nel team
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {/* Unassign option */}
              {selectedAssignee && (
                <button
                  onClick={() => handleAssign(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700"
                >
                  <X className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Rimuovi assegnazione
                  </span>
                </button>
              )}

              {members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssign(member.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedAssignee === member.user_id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.user?.name || member.user?.email}
                      </span>
                      {getRoleIcon(member.role)}
                    </div>
                    {member.user?.name && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </span>
                    )}
                  </div>
                  {selectedAssignee === member.user_id && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
