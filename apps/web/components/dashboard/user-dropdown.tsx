"use client";

import React, { useEffect, useRef, useState } from "react";

export type UserDropdownProps = {
  username: string;
  avatarUrl: string | null;
};

function getInitial(username: string): string {
  const trimmed = username.trim();
  const initial = trimmed[0] ?? "?";
  return initial.toUpperCase();
}

export default function UserDropdown({ username, avatarUrl }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onDocumentTouchStart(event: TouchEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("touchstart", onDocumentTouchStart);
    document.addEventListener("keydown", onDocumentKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("touchstart", onDocumentTouchStart);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="user-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-sm font-medium text-warm-700 shadow-sm transition-all hover:border-warm-300 hover:bg-warm-50 hover:text-warm-900"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${username} avatar`} className="size-8 rounded-full" />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-warm-200 text-sm font-semibold text-warm-700">
            {getInitial(username)}
          </div>
        )}
        <span className="hidden max-w-40 truncate sm:inline">{username}</span>
        <svg
          data-testid="user-dropdown-chevron"
          className={`size-4 text-warm-400 transition-transform group-hover:text-warm-600 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          data-testid="user-dropdown-menu"
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-warm-200 bg-white shadow-warm-lg"
        >
          <div className="border-b border-warm-100 px-4 py-3">
            <div className="text-xs font-medium text-warm-500">Signed in as</div>
            <div className="mt-1 truncate text-sm font-semibold text-warm-900">{username}</div>
          </div>
          <form action="/api/auth/logout" method="post" className="p-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50 hover:text-warm-900"
            >
              <svg className="size-4 text-warm-400" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

