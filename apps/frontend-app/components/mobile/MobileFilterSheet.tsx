"use client";

import { useState, useEffect } from "react";
import { X, Filter, ChevronDown, Check, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  type: "single" | "multi";
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filterGroups: FilterGroup[];
  activeFilters: Record<string, string | string[]>;
  onApply: (filters: Record<string, string | string[]>) => void;
  onReset: () => void;
  title?: string;
}

export default function MobileFilterSheet({
  isOpen,
  onClose,
  filterGroups,
  activeFilters,
  onApply,
  onReset,
  title = "Filtri",
}: MobileFilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<Record<string, string | string[]>>(activeFilters);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleFilterChange = (groupId: string, value: string, type: "single" | "multi") => {
    if (type === "single") {
      setLocalFilters((prev) => ({
        ...prev,
        [groupId]: prev[groupId] === value ? "" : value,
      }));
    } else {
      const currentValues = (localFilters[groupId] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      setLocalFilters((prev) => ({
        ...prev,
        [groupId]: newValues,
      }));
    }
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
    onClose();
  };

  const getActiveFilterCount = () => {
    return Object.values(localFilters).filter((v) =>
      Array.isArray(v) ? v.length > 0 : v !== ""
    ).length;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            {getActiveFilterCount() > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter groups */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filterGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const selectedValues = localFilters[group.id];
            const hasSelection = Array.isArray(selectedValues)
              ? selectedValues.length > 0
              : selectedValues !== "" && selectedValues !== undefined;

            return (
              <div
                key={group.id}
                className="border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between py-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {group.label}
                    </span>
                    {hasSelection && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="pb-4 space-y-2">
                    {group.options.map((option) => {
                      const isSelected = Array.isArray(selectedValues)
                        ? selectedValues.includes(option.value)
                        : selectedValues === option.value;

                      return (
                        <button
                          key={option.value}
                          onClick={() =>
                            handleFilterChange(group.id, option.value, group.type)
                          }
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <span className="text-sm">{option.label}</span>
                          <div className="flex items-center gap-2">
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {option.count}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 safe-area-bottom">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="primary" onClick={handleApply} className="flex-1">
            Applica filtri
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </>
  );
}
