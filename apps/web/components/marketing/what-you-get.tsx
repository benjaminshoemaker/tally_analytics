import React from 'react';

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: 'Real-time Feed',
    description:
      'Watch visitors navigate your site as it happens. See every page view the moment it occurs.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 7-4-14-3 7H2" />
      </svg>
    ),
  },
  {
    title: 'Traffic Over Time',
    description: 'Track page views and sessions hourly, daily, or monthly. Spot trends instantly.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 17l6-6 4 4 7-7" />
        <path d="M21 7v6h-6" />
      </svg>
    ),
  },
  {
    title: 'Top Pages',
    description: 'Know which pages get the most attention. See what content resonates.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
      </svg>
    ),
  },
  {
    title: 'Top Referrers',
    description:
      'Understand where your traffic comes from — Google, Twitter, direct, or that blog post that mentioned you.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 13a5 5 0 0 1 0-7l1.4-1.4a5 5 0 0 1 7 7L17 13" />
        <path d="M14 11a5 5 0 0 1 0 7l-1.4 1.4a5 5 0 0 1-7-7L7 11" />
      </svg>
    ),
  },
  {
    title: 'Session Analytics',
    description: 'See new vs. returning visitors. Understand how often people come back.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Device & Browser',
    description: 'Know what your visitors use — mobile vs. desktop, Chrome vs. Safari.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M7 20h10" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
];

export default function MarketingWhatYouGet() {
  return (
    <section className="bg-[#fcfaf8] py-24 dark:bg-[#1b140d]">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-40">
        <div className="mx-auto mb-16 max-w-2xl md:text-center">
          <h2 className="mb-4 font-display text-3xl font-semibold text-[#1b140d] dark:text-white">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-lg text-[#9a734c] dark:text-[#d0c0b0]">
            A clean dashboard with the metrics that actually matter for early-stage apps.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border border-[#e8e0d9] bg-white p-8 shadow-warm transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg dark:border-[#3e342b] dark:bg-[#221910]"
            >
              <div className="mb-6 flex size-12 items-center justify-center rounded bg-[#ec7f13]/10 text-[#ec7f13] transition-transform group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="mb-3 font-display text-xl font-semibold text-[#1b140d] dark:text-white">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-[#9a734c] dark:text-[#d0c0b0]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
