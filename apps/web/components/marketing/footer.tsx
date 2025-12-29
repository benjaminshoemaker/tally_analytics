import React from "react";

export type MarketingFooterProps = {
  githubUrl: string;
};

export default function MarketingFooter({ githubUrl }: MarketingFooterProps) {
  return (
    <footer className="border-t border-[#e8e0d9] bg-white py-12 dark:border-[#3e342b] dark:bg-[#1b140d]">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-8 px-6 md:flex-row md:px-10 lg:px-40">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-[#ec7f13]/20 text-[#ec7f13]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                fill="currentColor"
                d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
              />
            </svg>
          </div>
          <span className="font-bold text-[#1b140d] dark:text-white">Tally</span>
          <span className="ml-2 text-sm text-[#9a734c] dark:text-[#d0c0b0]">© {new Date().getFullYear()}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <a className="text-sm text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]" href="/privacy">
            Privacy Policy
          </a>
          <a className="text-sm text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]" href="/terms">
            Terms of Service
          </a>
          <a
            className="text-sm text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
            href="https://github.com/your-org/tally-analytics/issues"
            rel="noreferrer"
            target="_blank"
          >
            Support
          </a>
          <a
            className="text-sm text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
            href="https://x.com"
            rel="noreferrer"
            target="_blank"
          >
            Twitter
          </a>
          <a
            className="text-sm text-[#9a734c] transition-colors hover:text-[#ec7f13] dark:text-[#d0c0b0]"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
