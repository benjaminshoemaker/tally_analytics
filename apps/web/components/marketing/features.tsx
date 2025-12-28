import React from "react";

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: "Zero Configuration",
    description: "No script tags to copy-paste. No API keys to manage. Just merge the PR and you're live.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
        <path fill="currentColor" d="M11 2h2l1 7h7v2l-7 1-1 10h-2l-1-10-7-1V9h7l1-7z" />
      </svg>
    ),
  },
  {
    title: "GDPR Compliant",
    description: "We don't use cookies or track personal data. Fully anonymous and compliant by default.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
        <path
          fill="currentColor"
          d="M12 2l8 4v6c0 5-3.2 9.4-8 10-4.8-.6-8-5-8-10V6l8-4zm0 4.2L6 8.3V12c0 3.8 2.2 7.2 6 7.9 3.8-.7 6-4.1 6-7.9V8.3l-6-2.1z"
        />
      </svg>
    ),
  },
  {
    title: "Ultra Lightweight",
    description: "The tracking script is less than 1kb. It won't impact your Core Web Vitals or lighthouse score.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7">
        <path fill="currentColor" d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    ),
  },
];

export default function MarketingFeatures() {
  return (
    <section className="bg-primary-light/30 py-20">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-40">
        <div className="mx-auto mb-16 max-w-2xl md:text-center">
          <h2 className="mb-4 text-3xl font-semibold text-text-main">Analytics without the headache</h2>
          <p className="text-lg text-text-muted">
            Most analytics tools are overkill. Tally is designed to be invisible until you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-stone-100 bg-surface-light p-8 shadow-warm transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg"
            >
              <div className="mb-6 flex size-12 items-center justify-center rounded bg-primary/10 text-primary transition-transform group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-text-main">{feature.title}</h3>
              <p className="leading-relaxed text-text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
