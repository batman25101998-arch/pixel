import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Own a Hex of Earth",
  description: "Contact Own a Hex of Earth for questions or support."
};

export default function ContactPage() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#061425] px-4 py-10 text-slate-100 md:min-h-[calc(100vh-86px)] md:py-16">
      <article className="mx-auto max-w-[800px] rounded-lg border border-white/10 bg-[#071827] p-6 shadow-2xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Support</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Contact</h1>

        <div className="mt-8 space-y-5 text-sm leading-7 text-slate-300 md:text-base">
          <p>Questions or support?</p>
          <p>
            Email:{" "}
            <a className="font-medium text-emerald-300 underline-offset-4 hover:underline" href="mailto:support@hexofearth.com">
              support@hexofearth.com
            </a>
          </p>
          <p>We usually respond within 48 hours.</p>
        </div>
      </article>
    </section>
  );
}
