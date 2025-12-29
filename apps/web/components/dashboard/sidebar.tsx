"use client";

import React from "react";
import { usePathname } from "next/navigation";

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <path
        d="M16.5 14.25C16.5 14.6478 16.342 15.0294 16.0607 15.3107C15.7794 15.592 15.3978 15.75 15 15.75H3C2.60218 15.75 2.22064 15.592 1.93934 15.3107C1.65804 15.0294 1.5 14.6478 1.5 14.25V3.75C1.5 3.35218 1.65804 2.97064 1.93934 2.68934C2.22064 2.40804 2.60218 2.25 3 2.25H6.75L8.25 4.5H15C15.3978 4.5 15.7794 4.65804 16.0607 4.93934C16.342 5.22064 16.5 5.60218 16.5 6V14.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <path
        d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.55 11.25C14.4374 11.5026 14.4044 11.7824 14.4553 12.0535C14.5062 12.3245 14.6386 12.574 14.835 12.7725L14.8725 12.81C15.0315 12.9689 15.1576 13.1577 15.2436 13.3656C15.3296 13.5735 15.3739 13.7965 15.3739 14.0217C15.3739 14.247 15.3296 14.47 15.2436 14.6779C15.1576 14.8858 15.0315 15.0746 14.8725 15.2335C14.7136 15.3925 14.5248 15.5186 14.3169 15.6046C14.109 15.6906 13.886 15.7349 13.6608 15.7349C13.4355 15.7349 13.2125 15.6906 13.0046 15.6046C12.7967 15.5186 12.6079 15.3925 12.449 15.2335L12.4115 15.196C12.213 14.9996 11.9635 14.8672 11.6925 14.8163C11.4214 14.7654 11.1416 14.7984 10.889 14.911C10.6414 15.0186 10.4293 15.1945 10.278 15.4175C10.1268 15.6405 10.0426 15.9013 10.035 16.17V16.275C10.035 16.7286 9.85519 17.1636 9.5341 17.4847C9.213 17.8058 8.77804 17.9856 8.32453 17.9856C7.87101 17.9856 7.43605 17.8058 7.11495 17.4847C6.79386 17.1636 6.61403 16.7286 6.61403 16.275V16.215C6.60081 15.9377 6.50615 15.6705 6.34213 15.4461C6.17811 15.2218 5.95197 15.0499 5.69153 14.951C5.43894 14.8384 5.15916 14.8054 4.88808 14.8563C4.617 14.9072 4.36756 15.0396 4.16903 15.236L4.13153 15.2735C3.97262 15.4325 3.78383 15.5586 3.57591 15.6446C3.36798 15.7306 3.145 15.7749 2.91978 15.7749C2.69455 15.7749 2.47157 15.7306 2.26364 15.6446C2.05572 15.5586 1.86693 15.4325 1.70803 15.2735C1.54901 15.1146 1.42296 14.9258 1.33693 14.7179C1.2509 14.51 1.20661 14.287 1.20661 14.0617C1.20661 13.8365 1.2509 13.6135 1.33693 13.4056C1.42296 13.1977 1.54901 13.0089 1.70803 12.85L1.74553 12.8125C1.94189 12.614 2.07428 12.3645 2.1252 12.0935C2.17611 11.8224 2.14311 11.5426 2.03053 11.29C1.92296 11.0424 1.74702 10.8302 1.52402 10.679C1.30102 10.5278 1.04024 10.4436 0.771027 10.436H0.666027C0.212507 10.436 -0.222452 10.2562 -0.543546 9.93507C-0.86464 9.61398 -1.04447 9.17902 -1.04447 8.7255C-1.04447 8.27199 -0.86464 7.83703 -0.543546 7.51593C-0.222452 7.19484 0.212507 7.01501 0.666027 7.01501H0.726027C1.00336 7.00179 1.27057 6.90713 1.49488 6.74311C1.71919 6.57909 1.89112 6.35295 1.99003 6.09251C2.10261 5.83992 2.13561 5.56014 2.08469 5.28906C2.03378 5.01798 1.90139 4.76854 1.70503 4.57001L1.66753 4.53251C1.50851 4.3736 1.38246 4.18481 1.29643 3.97689C1.2104 3.76896 1.16611 3.54598 1.16611 3.32076C1.16611 3.09553 1.2104 2.87255 1.29643 2.66463C1.38246 2.4567 1.50851 2.26791 1.66753 2.10901C1.82643 1.94999 2.01522 1.82394 2.22315 1.73791C2.43107 1.65188 2.65405 1.60759 2.87928 1.60759C3.1045 1.60759 3.32748 1.65188 3.53541 1.73791C3.74333 1.82394 3.93212 1.94999 4.09103 2.10901L4.12853 2.14651C4.32706 2.34287 4.5765 2.47526 4.84758 2.52617C5.11866 2.57709 5.39844 2.54409 5.65103 2.43151H5.69153C5.93912 2.32393 6.15126 2.14799 6.30252 1.92499C6.45378 1.70199 6.53795 1.44121 6.54553 1.17201V1.06701C6.54553 0.613487 6.72536 0.178527 7.04645 -0.142567C7.36755 -0.46366 7.80251 -0.643494 8.25603 -0.643494C8.70954 -0.643494 9.1445 -0.46366 9.4656 -0.142567C9.7867 0.178527 9.96653 0.613487 9.96653 1.06701V1.12701C9.9741 1.39621 10.0583 1.65699 10.2096 1.87999C10.3608 2.10299 10.573 2.27893 10.8206 2.38651C11.0731 2.49909 11.3529 2.53209 11.624 2.48117C11.8951 2.43026 12.1445 2.29787 12.343 2.10151L12.3805 2.06401C12.5394 1.90499 12.7282 1.77894 12.9362 1.69291C13.1441 1.60688 13.3671 1.56259 13.5923 1.56259C13.8175 1.56259 14.0405 1.60688 14.2485 1.69291C14.4564 1.77894 14.6452 1.90499 14.8041 2.06401C14.9631 2.22291 15.0891 2.4117 15.1752 2.61963C15.2612 2.82755 15.3055 3.05053 15.3055 3.27576C15.3055 3.50098 15.2612 3.72396 15.1752 3.93189C15.0891 4.13981 14.9631 4.3286 14.8041 4.48751L14.7666 4.52501C14.5702 4.72354 14.4378 4.97298 14.3869 5.24406C14.336 5.51514 14.369 5.79492 14.4816 6.04751V6.08801C14.5891 6.33559 14.7651 6.54773 14.9881 6.69899C15.2111 6.85025 15.4719 6.93443 15.741 6.94201H15.846C16.2996 6.94201 16.7345 7.12184 17.0556 7.44293C17.3767 7.76403 17.5566 8.19899 17.5566 8.6525C17.5566 9.10602 17.3767 9.54098 17.0556 9.86208C16.7345 10.1832 16.2996 10.363 15.846 10.363H15.786C15.5168 10.3706 15.256 10.4547 15.033 10.606C14.81 10.7573 14.6341 10.9694 14.5265 11.217L14.55 11.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NavSection = {
  title?: string;
  items: NavItem[];
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPattern?: RegExp;
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        href: "/projects",
        label: "Projects",
        icon: FolderIcon,
        matchPattern: /^\/projects/,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        matchPattern: /^\/settings/,
      },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 px-4 py-4 sm:px-6 md:flex-col md:items-stretch md:gap-0 md:py-6">
      {/* Logo for desktop */}
      <a href="/" className="mb-6 hidden items-center gap-2 md:flex">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            <path
              fill="currentColor"
              d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
            />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight text-warm-900">Tally</span>
      </a>

      {NAV_SECTIONS.map((section, sectionIndex) => (
        <div key={section.title || sectionIndex} className="md:mb-4">
          {section.title && (
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wider text-warm-400 md:block">
              {section.title}
            </p>
          )}
          <div className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-0.5">
            {section.items.map((item) => {
              const isActive = item.matchPattern ? item.matchPattern.test(pathname) : pathname === item.href;
              const Icon = item.icon;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={[
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-brand-500/10 text-brand-600"
                      : "text-warm-600 hover:bg-warm-100 hover:text-warm-900",
                  ].join(" ")}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500 md:block" />
                  )}
                  <Icon className={isActive ? "text-brand-500" : "text-warm-400 transition-colors group-hover:text-warm-600"} />
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
