import React from "react";

export type PricingCardProps = {
  name: string;
  priceLabel: string;
  priceSuffix: string;
  eventsLabel: string;
  projectsLabel: string;
  retentionLabel: string;
  supportLabel: string;
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
};

export default function PricingCard(props: PricingCardProps) {
  return (
    <div
      className={`group relative rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
        props.highlighted
          ? "border-brand-500/30 bg-gradient-to-b from-brand-50 to-white shadow-warm-lg shadow-brand-500/5"
          : "border-[#e8e0d9] bg-white shadow-warm hover:shadow-warm-lg"
      }`}
    >
      {props.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ec7f13] px-3 py-1 text-xs font-semibold text-white shadow-warm">
            <svg className="size-3" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4 6 1z" fill="currentColor"/>
            </svg>
            Most popular
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#1b140d]">{props.name}</h3>
        </div>

        <div className="text-right">
          <div className="font-display text-3xl tracking-tight text-[#1b140d]">{props.priceLabel}</div>
          <div className="text-sm text-[#9a734c]">{props.priceSuffix}</div>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f3ede7]/50 px-3 py-2">
          <dt className="text-[#9a734c]">Events</dt>
          <dd className="font-medium text-[#1b140d]">{props.eventsLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="text-[#9a734c]">Projects</dt>
          <dd className="font-medium text-[#1b140d]">{props.projectsLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f3ede7]/50 px-3 py-2">
          <dt className="text-[#9a734c]">Retention</dt>
          <dd className="font-medium text-[#1b140d]">{props.retentionLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="text-[#9a734c]">Support</dt>
          <dd className="font-medium text-[#1b140d]">{props.supportLabel}</dd>
        </div>
      </dl>

      <a
        href={props.ctaHref}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
          props.highlighted
            ? "bg-[#ec7f13] text-white shadow-warm hover:bg-orange-600 hover:shadow-warm-md"
            : "border border-[#e8e0d9] bg-white text-[#1b140d] hover:border-[#d6cdc3] hover:bg-[#f3ede7]"
        }`}
      >
        {props.ctaLabel}
        <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    </div>
  );
}

