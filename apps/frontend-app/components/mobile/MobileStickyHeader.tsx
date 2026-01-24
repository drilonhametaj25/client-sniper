"use client";

import { useState, useEffect, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface MobileStickyHeaderProps {
  title: string;
  subtitle?: string;
  score?: number;
  showBackButton?: boolean;
  backHref?: string;
  rightContent?: ReactNode;
  threshold?: number;
}

export default function MobileStickyHeader({
  title,
  subtitle,
  score,
  showBackButton = true,
  backHref,
  rightContent,
  threshold = 100,
}: MobileStickyHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (score >= 50) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <>
      {/* Sticky header - appears on scroll */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 transition-transform duration-200 md:hidden ${
          isSticky ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-1 -ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {score !== undefined && (
              <div
                className={`px-2 py-1 rounded-lg text-sm font-bold ${getScoreColor(
                  score
                )}`}
              >
                {score}
              </div>
            )}
            {rightContent}
          </div>
        </div>
      </div>

      {/* Static header - always visible at top of content */}
      <div className="md:hidden px-4 pt-4">
        <div className="flex items-center gap-3 mb-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {score !== undefined && (
            <div
              className={`px-3 py-1.5 rounded-xl text-lg font-bold ${getScoreColor(
                score
              )}`}
            >
              {score}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
