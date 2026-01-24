"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

interface MobileTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "default" | "pills" | "underline";
  className?: string;
}

export default function MobileTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = "default",
  className = "",
}: MobileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const activeButton = activeTabRef.current;

      const containerRect = scrollContainer.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      // Check if button is not fully visible
      if (buttonRect.left < containerRect.left) {
        scrollContainer.scrollTo({
          left: activeButton.offsetLeft - 16,
          behavior: "smooth",
        });
      } else if (buttonRect.right > containerRect.right) {
        scrollContainer.scrollTo({
          left:
            activeButton.offsetLeft -
            containerRect.width +
            buttonRect.width +
            16,
          behavior: "smooth",
        });
      }

      // Update indicator position for underline variant
      if (variant === "underline") {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: buttonRect.width,
        });
      }
    }
  }, [activeTab, variant]);

  const getTabStyles = (isActive: boolean) => {
    switch (variant) {
      case "pills":
        return isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700";
      case "underline":
        return isActive
          ? "text-blue-600 dark:text-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300";
      default:
        return isActive
          ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-700"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide scroll-snap-x gap-2 px-4 py-2 -mx-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 scroll-snap-start tap-highlight-none ${getTabStyles(
                isActive
              )}`}
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold rounded-full ${
                    isActive
                      ? variant === "pills"
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Underline indicator */}
      {variant === "underline" && (
        <div
          className="absolute bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-200"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      )}

      {/* Fade edges for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent pointer-events-none md:hidden" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent pointer-events-none md:hidden" />
    </div>
  );
}
