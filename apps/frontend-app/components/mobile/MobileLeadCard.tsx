"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Star,
} from "lucide-react";
import Badge from "@/components/ui/Badge";

interface MobileLeadCardProps {
  id: string;
  businessName: string;
  website?: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  category?: string | null;
  score?: number;
  crmStatus?: string | null;
  isHot?: boolean;
  isUnlocked?: boolean;
  onClick?: () => void;
}

export default function MobileLeadCard({
  id,
  businessName,
  website,
  email,
  phone,
  city,
  category,
  score,
  crmStatus,
  isHot,
  isUnlocked,
  onClick,
}: MobileLeadCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70)
      return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
    if (score >= 50)
      return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
  };

  const getCrmStatusVariant = (status: string | null | undefined): "default" | "info" | "success" | "warning" | "error" => {
    switch (status) {
      case "to_contact":
        return "default";
      case "in_negotiation":
        return "info";
      case "won":
        return "success";
      case "lost":
        return "error";
      default:
        return "default";
    }
  };

  const getCrmStatusLabel = (status: string | null | undefined) => {
    switch (status) {
      case "to_contact":
        return "Da contattare";
      case "in_negotiation":
        return "In trattativa";
      case "won":
        return "Vinto";
      case "lost":
        return "Perso";
      default:
        return "Nuovo";
    }
  };

  const CardContent = () => (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {businessName}
            </h3>
            {isHot && (
              <span className="flex-shrink-0 text-orange-500" title="Hot Lead">
                <Star className="w-4 h-4 fill-current" />
              </span>
            )}
          </div>
          {website && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <Globe className="w-3 h-3 flex-shrink-0" />
              {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </p>
          )}
        </div>
        {score !== undefined && (
          <div
            className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold ${getScoreColor(
              score
            )}`}
          >
            {score}
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {email && (
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Mail className="w-3.5 h-3.5 text-green-500" />
            <span className="truncate max-w-[120px]">{email}</span>
          </span>
        )}
        {phone && (
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <Phone className="w-3.5 h-3.5 text-blue-500" />
            <span>{phone}</span>
          </span>
        )}
        {!email && !phone && (
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            Nessun contatto disponibile
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 overflow-hidden">
          {city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{city}</span>
            </span>
          )}
          {category && (
            <Badge variant="default" size="sm" className="truncate max-w-[100px]">
              {category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {crmStatus && (
            <Badge variant={getCrmStatusVariant(crmStatus)} size="sm">
              {getCrmStatusLabel(crmStatus)}
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 tap-highlight-none"
      >
        <CardContent />
      </button>
    );
  }

  return (
    <Link
      href={`/lead/${id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 tap-highlight-none"
    >
      <CardContent />
    </Link>
  );
}
