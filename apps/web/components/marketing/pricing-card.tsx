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
  const border = props.highlighted ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white";
  const button =
    props.highlighted
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{props.name}</h3>
          {props.highlighted ? (
            <span className="mt-2 inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
              Most popular
            </span>
          ) : null}
        </div>

        <div className="text-right">
          <div className="text-3xl font-semibold tracking-tight text-slate-900">{props.priceLabel}</div>
          <div className="text-sm text-slate-600">{props.priceSuffix}</div>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Events</dt>
          <dd className="font-medium text-slate-900">{props.eventsLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Projects</dt>
          <dd className="font-medium text-slate-900">{props.projectsLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Retention</dt>
          <dd className="font-medium text-slate-900">{props.retentionLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-600">Support</dt>
          <dd className="font-medium text-slate-900">{props.supportLabel}</dd>
        </div>
      </dl>

      <a
        href={props.ctaHref}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${button}`}
      >
        {props.ctaLabel}
      </a>
    </div>
  );
}

