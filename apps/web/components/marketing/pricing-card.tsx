import React from "react";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M13.5 4.5l-7 7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export type PricingCardProps = {
  name: string;
  priceLabel: string;
  priceSuffix: string;
  eventsLabel: string;
  projectsLabel: string;
  retentionLabel: string;
  supportLabel: string;
  ctaLabel: string;
  ctaHref?: string;
  ctaForm?: {
    action: string;
    method: "post" | "get";
    hiddenFields?: Record<string, string>;
  };
  ctaDisabled?: boolean;
  highlighted?: boolean;
};

export default function PricingCard(props: PricingCardProps) {
  const ctaClassName = `group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
    props.highlighted
      ? "bg-[#ec7f13] text-white shadow-warm hover:bg-orange-600 hover:shadow-warm-md active:shadow-none"
      : "border border-[#e8e0d9] bg-white text-[#1b140d] hover:border-[#d6cdc3] hover:bg-[#f3ede7]"
  }`;

  const ctaInner = (
    <>
      {props.ctaLabel}
      <svg className="size-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8h10M9 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  // Determine which features are "enhanced" for this tier
  const isUnlimited = (value: string) => value.toLowerCase().includes("unlimited");
  const isPriority = (value: string) => value.toLowerCase().includes("priority");

  return (
    <div
      className={`group/card relative rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
        props.highlighted
          ? "border-brand-500/30 bg-gradient-to-b from-brand-50 to-white shadow-warm-lg shadow-brand-500/5"
          : "border-[#e8e0d9] bg-white shadow-warm hover:shadow-warm-lg"
      }`}
    >
      {props.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ec7f13] px-3 py-1 text-xs font-semibold text-white shadow-warm animate-pulse" style={{ animationDuration: "3s" }}>
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

      <dl className="mt-6 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f3ede7]/50 px-3 py-2">
          <dt className="flex items-center gap-2 text-[#9a734c]">
            <CheckIcon className="size-4 text-emerald-500" />
            Events
          </dt>
          <dd className="font-medium text-[#1b140d]">{props.eventsLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="flex items-center gap-2 text-[#9a734c]">
            <CheckIcon className="size-4 text-emerald-500" />
            Projects
          </dt>
          <dd className={`font-medium ${isUnlimited(props.projectsLabel) ? "text-brand-600" : "text-[#1b140d]"}`}>
            {props.projectsLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f3ede7]/50 px-3 py-2">
          <dt className="flex items-center gap-2 text-[#9a734c]">
            <CheckIcon className="size-4 text-emerald-500" />
            Retention
          </dt>
          <dd className={`font-medium ${isUnlimited(props.retentionLabel) ? "text-brand-600" : "text-[#1b140d]"}`}>
            {props.retentionLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-3 py-2">
          <dt className="flex items-center gap-2 text-[#9a734c]">
            <CheckIcon className="size-4 text-emerald-500" />
            Support
          </dt>
          <dd className={`font-medium ${isPriority(props.supportLabel) ? "text-brand-600" : "text-[#1b140d]"}`}>
            {props.supportLabel}
          </dd>
        </div>
      </dl>

      {props.ctaForm ? (
        <form action={props.ctaForm.action} method={props.ctaForm.method}>
          {props.ctaForm.hiddenFields
            ? Object.entries(props.ctaForm.hiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))
            : null}
          <button type="submit" className={ctaClassName} disabled={props.ctaDisabled}>
            {ctaInner}
          </button>
        </form>
      ) : (
        <a href={props.ctaHref} className={ctaClassName} aria-disabled={props.ctaDisabled}>
          {ctaInner}
        </a>
      )}
    </div>
  );
}
