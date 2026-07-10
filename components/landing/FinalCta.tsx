'use client';

import { BackgroundBeams } from '../ui/background-beams';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import { ScrollReveal } from './ScrollReveal';

export function FinalCta({ loginUrl }: { loginUrl: string }) {
  return (
    <section className="landing-section final-cta">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface px-6 py-20">
        <BackgroundBeams />
        <ScrollReveal className="relative z-10">
          <h2>Point CodeMind at your next repo.</h2>
          <p>Free to try. Takes about a minute to connect.</p>
          <div className="mt-7 flex justify-center">
            <HoverBorderGradient
              as="a"
              containerClassName="rounded-full no-underline"
              className="bg-[#0d0d10] px-6 py-2.5 text-[0.95rem] font-semibold text-white"
              {...{ href: loginUrl }}
            >
              Get started
            </HoverBorderGradient>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
