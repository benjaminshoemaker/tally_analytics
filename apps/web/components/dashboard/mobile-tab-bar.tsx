"use client";

import React from "react";
import { usePathname } from "next/navigation";

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={className}>
      <path
        d="M20.167 17.417c0 .486-.193.953-.537 1.296a1.833 1.833 0 01-1.297.537H3.667a1.833 1.833 0 01-1.834-1.833V4.583c0-.486.193-.952.537-1.296a1.833 1.833 0 011.297-.537h4.583l1.833 2.75h7.334c.486 0 .952.193 1.296.537.344.344.537.81.537 1.296v10.084z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={className}>
      <path
        d="M11 13.75a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.787 13.75a1.513 1.513 0 00.302 1.67l.055.055a1.835 1.835 0 11-2.595 2.594l-.055-.055a1.526 1.526 0 00-2.585 1.082v.154a1.833 1.833 0 01-3.667 0v-.082a1.513 1.513 0 00-.99-1.385 1.513 1.513 0 00-1.67.303l-.055.055a1.835 1.835 0 11-2.594-2.595l.055-.055a1.526 1.526 0 00-1.082-2.585h-.154a1.833 1.833 0 110-3.667h.082a1.513 1.513 0 001.385-.99 1.513 1.513 0 00-.303-1.67l-.055-.055a1.835 1.835 0 112.595-2.594l.055.055a1.513 1.513 0 001.67.302h.073a1.513 1.513 0 00.917-1.385v-.154a1.833 1.833 0 013.667 0v.082a1.526 1.526 0 002.585 1.082l.055-.055a1.835 1.835 0 112.594 2.595l-.055.055a1.513 1.513 0 00-.302 1.67v.073a1.513 1.513 0 001.385.917h.154a1.833 1.833 0 010 3.667h-.082a1.513 1.513 0 00-1.385.99z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TabItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPattern: RegExp;
};

const TAB_ITEMS: TabItem[] = [
  {
    href: "/projects",
    label: "Projects",
    icon: FolderIcon,
    matchPattern: /^\/projects/,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    matchPattern: /^\/settings/,
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-warm-200 bg-white/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-6">
        {TAB_ITEMS.map((item) => {
          const isActive = item.matchPattern.test(pathname);
          const Icon = item.icon;

          return (
            <a
              key={item.href}
              href={item.href}
              className={[
                "group relative flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200",
                isActive ? "text-brand-500" : "text-warm-400",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-500" />
              )}
              <Icon
                className={[
                  "transition-transform duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105 group-active:scale-95",
                ].join(" ")}
              />
              <span
                className={[
                  "text-xs font-medium transition-colors",
                  isActive ? "text-brand-600" : "text-warm-500 group-hover:text-warm-700",
                ].join(" ")}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
      {/* Safe area spacer for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
