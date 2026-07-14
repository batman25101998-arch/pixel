import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Own a Hex of Earth",
  description: "Read the terms for buying and customizing permanent digital hexes inside Own a Hex of Earth."
};

export default function TermsOfServicePage() {
  return (
    <section className="min-h-[calc(100vh-64px)] bg-[#061425] px-4 py-10 text-slate-100 md:min-h-[calc(100vh-86px)] md:py-16">
      <article className="mx-auto max-w-[800px] rounded-lg border border-white/10 bg-[#071827] p-6 shadow-2xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-400">Last updated July 14, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300 md:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">Digital Hex Purchases</h2>
            <p className="mt-3">
              Own a Hex of Earth lets users purchase a permanent digital hex inside the Hex of Earth platform. Each available hex costs $1. Once purchased, the hex is assigned to the purchasing user inside the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">No Real-World Land Ownership</h2>
            <p className="mt-3">
              Purchasing a hex does not give you ownership, control, rights or claims over any real-world land, property, government territory, address or geographic location. Hex ownership exists only inside Hex of Earth as a digital collectible and profile space.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Your Content</h2>
            <p className="mt-3">
              You are responsible for titles, messages, uploaded images and links added to your hexes. You must have the rights needed to upload and display your content. Illegal, offensive, hateful, abusive, misleading, infringing or harmful content is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Content Moderation</h2>
            <p className="mt-3">
              We may remove or disable content that violates these terms, creates legal risk, harms other users or damages the service. Removing content does not necessarily remove the underlying digital hex assignment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Payments and Refunds</h2>
            <p className="mt-3">
              Payments are handled through Stripe. Purchases are intended to be permanent and cannot be undone through normal account controls. Refunds are provided only where required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Accounts</h2>
            <p className="mt-3">
              You are responsible for keeping your account secure and for activity under your account. We may restrict access if an account is used to break these terms, abuse the platform or interfere with the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Service Changes</h2>
            <p className="mt-3">
              We may update the product, map, technical systems or policies as the service evolves. We will aim to preserve the core promise that purchased hexes remain assigned inside Hex of Earth.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">Contact</h2>
            <p className="mt-3">
              Questions about these terms can be sent through the{" "}
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
