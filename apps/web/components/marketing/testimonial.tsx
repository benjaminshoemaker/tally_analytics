import React from "react";

export default function MarketingTestimonial() {
  return (
    <section className="border-y border-[#e8e0d9] bg-[#f3ede7]/60 py-20 dark:border-[#3e342b] dark:bg-[#2a221b]/40">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto mb-6 size-10 text-[#ec7f13]/40">
          <path
            fill="currentColor"
            d="M10 11H6c0-3 2-6 6-6v3c-2 0-2 2-2 3zm8 0h-4c0-3 2-6 6-6v3c-2 0-2 2-2 3zM8 13h4v6H8v-6zm8 0h4v6h-4v-6z"
          />
        </svg>
        <blockquote className="mb-8 text-2xl font-medium leading-relaxed text-[#1b140d] md:text-3xl dark:text-white">
          &quot;Finally, analytics that doesn&apos;t feel like spyware. It took me literally 30 seconds to set up on my
          personal portfolio.&quot;
        </blockquote>

        <div className="flex items-center justify-center gap-4">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-sm font-bold text-stone-700">
            AC
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-[#1b140d] dark:text-white">Alex Chen</div>
            <div className="text-xs text-[#9a734c] dark:text-[#d0c0b0]">Frontend Engineer at Vercel</div>
          </div>
        </div>
      </div>
    </section>
  );
}
