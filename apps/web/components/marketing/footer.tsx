import React from "react";

export type MarketingFooterProps = {
  githubUrl: string;
};

export default function MarketingFooter({ githubUrl }: MarketingFooterProps) {
  return (
    <footer className="border-t border-stone-100 bg-white py-12">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-8 px-6 md:flex-row md:px-10 lg:px-40">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary/20 text-primary">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                fill="currentColor"
                d="M3 3h18v18H3V3zm4 14h2V9H7v8zm4 0h2V5h-2v12zm4 0h2v-6h-2v6z"
              />
            </svg>
          </div>
          <span className="font-bold text-text-main">Tally</span>
          <span className="ml-2 text-sm text-text-muted">© {new Date().getFullYear()}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <a className="text-sm text-text-muted transition-colors hover:text-primary" href="#">
            Privacy Policy
          </a>
          <a className="text-sm text-text-muted transition-colors hover:text-primary" href="#">
            Terms of Service
          </a>
          <a
            className="text-sm text-text-muted transition-colors hover:text-primary"
            href="https://x.com"
            rel="noreferrer"
            target="_blank"
          >
            Twitter
          </a>
          <a
            className="text-sm text-text-muted transition-colors hover:text-primary"
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

