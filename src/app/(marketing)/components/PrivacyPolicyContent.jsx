"use client";

import React from "react";
import { LANDING_CONTACT_EMAIL } from "@/lib/landingContact";
import { Reveal } from "./Reveal";

const LAST_UPDATED = "4 September 2026";

const SECTIONS = [
  {
    heading: "1. Who we are",
    body: [
      "Asymmetrix (\u201cAsymmetrix\u201d, \u201cwe\u201d, \u201cus\u201d or \u201cour\u201d) provides market intelligence on the Data & Analytics industry, including company, investor, advisor and deal data. This policy explains what information we collect through this website, why we collect it, and the choices you have.",
    ],
  },
  {
    heading: "2. Information we collect",
    list: [
      "Contact details you provide directly — such as your name, email address, phone number and company — when you submit a form (e.g. requesting a demo or contacting our team).",
      "Usage data collected automatically, such as pages visited, referring URLs, device and browser type, and approximate location, typically via cookies and similar technologies.",
      "Communications you send us, including any information you choose to include in a message.",
    ],
  },
  {
    heading: "3. Cookies",
    body: [
      "We use cookies and similar technologies to keep the site working correctly, remember your preferences, and understand how visitors use our site so we can improve it. You can accept or decline non-essential cookies via the cookie banner shown on your first visit, and you can change your browser settings at any time to block or delete cookies.",
    ],
  },
  {
    heading: "4. How we use your information",
    list: [
      "To respond to inquiries and provide the information or demo you requested.",
      "To operate, maintain and improve this website and our services.",
      "To send you relevant updates, where you have agreed to receive them.",
      "To comply with our legal obligations.",
    ],
  },
  {
    heading: "5. Sharing your information",
    body: [
      "We do not sell your personal information. We may share it with trusted service providers who help us operate our website and business (for example, email delivery, hosting and analytics providers), and where required by law.",
    ],
  },
  {
    heading: "6. Data retention",
    body: [
      "We retain personal information for as long as necessary to fulfil the purposes described in this policy, unless a longer retention period is required or permitted by law.",
    ],
  },
  {
    heading: "7. Your rights",
    body: [
      "Depending on where you are located, you may have rights to access, correct, delete, or restrict the use of your personal information, and to object to certain processing. To exercise any of these rights, contact us using the details below.",
    ],
  },
  {
    heading: "8. Contact us",
    body: [
      "If you have any questions about this policy or how we handle your information, please reach out.",
    ],
  },
];

export function PrivacyPolicyContent() {
  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-24 lg:pb-28 lg:pt-28">
      <div className="container">
        <Reveal className="mx-auto w-full max-w-5xl">
          <article className="landing-panel overflow-hidden rounded-xl">
            <header className="border-b border-[var(--asymmetrix-divider)] px-6 py-8 md:px-10 md:py-10">
              <span className="landing-text-muted text-xs font-medium md:text-sm">
                Last updated {LAST_UPDATED}
              </span>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-text-alternative md:text-4xl lg:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-4 text-base leading-relaxed text-text-alternative md:text-lg">
                Your privacy matters to us. This policy explains how
                Asymmetrix collects, uses and protects your information when
                you visit this website.
              </p>
            </header>

            <div className="px-6 py-8 md:px-10 md:py-10">
              {SECTIONS.map((section, index) => (
                <div key={section.heading} className={index === 0 ? "" : "mt-8"}>
                  <h2 className="mb-3 text-lg font-bold text-text-alternative md:text-xl">
                    {section.heading}
                  </h2>
                  {section.body?.map((paragraph, pIndex) => (
                    <p
                      key={pIndex}
                      className="mb-3 text-base leading-relaxed text-text-alternative last:mb-0 md:text-md"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.list ? (
                    <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-text-alternative md:text-md">
                      {section.list.map((item, iIndex) => (
                        <li key={iIndex}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}

              <div className="landing-press-contact mt-10 rounded-xl px-5 py-4 md:px-6 md:py-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-text-alternative">
                  Contact
                </p>
                <a
                  href={`mailto:${LANDING_CONTACT_EMAIL}`}
                  className="mt-1 inline-block text-base font-medium text-[var(--asymmetrix-blue-deep)] transition-colors hover:text-[var(--asymmetrix-blue)]"
                >
                  {LANDING_CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
