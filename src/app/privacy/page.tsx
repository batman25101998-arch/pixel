import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Own a Hex of Earth",
  description: "Learn how Own a Hex of Earth handles account data, payments, uploaded images, cookies, analytics and data deletion requests."
};

export default function PrivacyPolicyPage() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#061425] px-4 py-10 text-slate-100 md:min-h-[calc(100vh-86px)] md:py-16">
      <article className="mx-auto max-w-[800px] rounded-lg border border-white/10 bg-[#071827] p-6 shadow-2xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-400">Last updated July 14, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300 md:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">Overview</h2>
            <p className="mt-3">
              Own a Hex of Earth lets people claim a permanent digital hex on the world map, customize it and display public content. This policy explains what data we collect, why we use it and how you can contact us about your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Google Authentication</h2>
            <p className="mt-3">
              When you sign in with Google, we receive basic account information such as your email address, name and profile image. We use this information to create your account, keep you signed in and show your public owner profile where needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Stripe Payments</h2>
            <p className="mt-3">
              Payments are processed by Stripe. We do not store your full card number. We store purchase records, Stripe checkout identifiers and payment status so your claimed hex can be assigned to your account and verified later.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Uploaded Images and Public Content</h2>
            <p className="mt-3">
              If you upload an image or add a title, message or external link to a hex, that content may be displayed publicly on the map and in related pages. You are responsible for the content you upload and should only upload material you have the right to use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Cookies</h2>
            <p className="mt-3">
              We use cookies and similar browser storage for authentication, security, session management and basic preferences. Some cookies are required for sign-in and checkout flows to work correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Analytics</h2>
            <p className="mt-3">
              We may use analytics to understand site traffic, product usage and technical performance. Analytics helps us improve the map experience and diagnose problems. We aim to collect only what is useful for operating and improving the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Data Deletion Requests</h2>
            <p className="mt-3">
              You can request deletion of your personal data by contacting us at{" "}
              <a className="text-emerald-300 underline-offset-4 hover:underline" href="mailto:support@hexofearth.com">
                support@hexofearth.com
              </a>
              . We may retain records when required for security, legal compliance, payment history or to preserve the integrity of permanent public hex ownership records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-3">
              Questions about this policy can be sent through the{" "}
              <Link className="text-emerald-300 underline-offset-4 hover:underline" href="/contact">
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
