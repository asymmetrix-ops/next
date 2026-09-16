"use client";

import React from "react";
const LAST_UPDATED = "16 September 2026";
const EVENTS_EMAIL = "events@asymmetrixintelligence.com";
const SUMMIT_URL = "https://events.asymmetrixintelligence.com/london-2026";

const SECTIONS = [
  {
    heading: "1. Booking & Payment",
    clauses: [
      "1.1. All bookings for the Summit are subject to these Terms & Conditions.",
      "1.2. The Summit is invitation-only. A booking is confirmed once it has been accepted by Asymmetrix, and Asymmetrix reserves the right to decline any booking that does not meet the Summit's eligibility criteria.",
      "1.3. Where an invoice is issued, payment must be made within 14 days of the invoice date, unless otherwise agreed in writing.",
      "1.4. Asymmetrix reserves the right to cancel or suspend a booking where payment has not been received within the applicable payment period.",
      "1.5. The Customer is responsible for providing accurate billing and Delegate information at the time of booking.",
    ],
  },
  {
    heading: "2. VAT & Invoicing",
    clauses: [
      "2.1. All ticket prices are stated in pounds sterling and exclusive of VAT unless otherwise specified. VAT will be charged at the applicable rate.",
      "2.2. A VAT invoice will be issued to the Customer where applicable.",
      "2.3. Any discount (including early bird, client, sponsor or complimentary rates) applies only as stated at the time of booking and cannot be applied retrospectively.",
      "2.4. The Customer is responsible for ensuring that billing details, purchase order information and any other information required for invoicing are provided correctly and promptly.",
    ],
  },
  {
    heading: "3. Cancellations & Refunds",
    clauses: [
      "3.1. Cancellation requests must be submitted in writing to events@asymmetrixintelligence.com.",
      "3.2. Cancellations received 30 working days or more before the Summit (that is, on or before Tuesday 22 September 2026) will be eligible for a full refund of the booking fee.",
      "3.3. Cancellations received fewer than 30 working days before the Summit are non-refundable.",
      "3.4. The cancellation policy applies regardless of whether the applicable invoice has been paid. Where an invoice remains unpaid at the time of cancellation, the Customer remains liable for any booking fee that is non-refundable under these Terms & Conditions.",
      "3.5. Where a booking is cancelled within the refundable period but the Customer has not yet paid the relevant invoice, the invoice will be cancelled rather than a refund being issued.",
      "3.6. Non-attendance at the Summit does not entitle the Customer to a refund.",
      '3.7. For the purposes of these Terms & Conditions, "working days" means Monday to Friday, excluding public holidays in England and Wales.',
    ],
  },
  {
    heading: "4. Delegate Substitutions",
    clauses: [
      "4.1. If a registered Delegate is unable to attend, the Customer may nominate a replacement Delegate from the same company or organisation at no additional charge.",
      "4.2. Bookings are not transferable between companies or organisations.",
      "4.3. Details of any replacement Delegate must be provided in writing by 5pm (UK time) on Friday 30 October 2026. Requests received after this time cannot be guaranteed, as badges and catering will already be confirmed with the venue.",
      "4.4. Asymmetrix reserves the right to refuse a replacement Delegate where the proposed Delegate does not meet the Summit's eligibility or access requirements.",
    ],
  },
  {
    heading: "5. Changes, Cancellation or Postponement of the Summit",
    clauses: [
      "5.1. Asymmetrix reserves the right to make reasonable changes to the Summit programme, speakers, timings, venue or format.",
      "5.2. Asymmetrix reserves the right to cancel or postpone the Summit where circumstances make this necessary.",
      "5.3. If the Summit is cancelled by Asymmetrix, the Customer will be offered a full refund of the booking fee or, where applicable, the option to transfer the booking to a rescheduled event.",
      "5.4. If the Summit is postponed, the Customer's booking may be transferred to the rescheduled event. Details of any applicable refund arrangements will be communicated to the Customer at the time.",
      "5.5. Asymmetrix will not be responsible for travel, accommodation or other costs incurred by the Customer or any Delegate in connection with the Summit.",
    ],
  },
  {
    heading: "6. Force Majeure",
    clauses: [
      "6.1. Asymmetrix will not be liable for any cancellation, postponement, delay or failure to deliver the Summit resulting from circumstances beyond its reasonable control, including extreme weather, natural disasters, government restrictions, industrial disputes, venue closure, transport disruption, security concerns or other circumstances affecting the safe or practical delivery of the Summit.",
    ],
  },
  {
    heading: "7. Delegate Conduct",
    clauses: [
      "7.1. Delegates are expected to behave professionally and respectfully towards other attendees, speakers, sponsors, exhibitors, venue staff and Summit personnel.",
      "7.2. Delegates are required to comply with the venue's rules and with any health, safety or security requirements notified to them.",
      "7.3. Asymmetrix reserves the right to refuse admission or remove a Delegate where their behaviour is inappropriate, disruptive, abusive or otherwise adversely affects the safety or experience of others. No refund will be due in these circumstances.",
    ],
  },
  {
    heading: "8. Photography & Recording",
    clauses: [
      "8.1. Photography, video and/or audio recording may take place during the Summit for marketing, promotional and editorial purposes.",
      "8.2. By attending the Summit, Delegates acknowledge that they may appear incidentally in such recordings.",
      "8.3. Delegates who would prefer not to be featured should notify events@asymmetrixintelligence.com in advance or speak to a member of the Asymmetrix team on the day.",
    ],
  },
  {
    heading: "9. Data Protection",
    clauses: [
      "9.1. Personal information provided in connection with a booking will be processed in accordance with Asymmetrix's Privacy Policy and applicable data protection legislation.",
      "9.2. Information may be used to administer the booking, communicate with the Customer and Delegates regarding the Summit, and provide relevant event-related information.",
    ],
  },
  {
    heading: "10. Liability",
    clauses: [
      "10.1. Nothing in these Terms & Conditions shall exclude or limit liability that cannot lawfully be excluded or limited.",
      "10.2. Subject to clause 10.1, Asymmetrix shall not be liable for any indirect or consequential loss, or for loss of profits, revenue, business, anticipated savings or business opportunity arising from or in connection with the Summit.",
      "10.3. The Customer is responsible for any travel, accommodation and other costs incurred in connection with attendance at the Summit.",
    ],
  },
  {
    heading: "11. General",
    clauses: [
      "11.1. These Terms & Conditions, together with the booking confirmation and any Summit-specific information provided by Asymmetrix, constitute the terms applicable to the booking.",
      "11.2. If any provision of these Terms & Conditions is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
      "11.3. These Terms & Conditions and any dispute arising in connection with them shall be governed by the laws of England and Wales, and the courts of England and Wales shall have exclusive jurisdiction.",
    ],
  },
];

export function TermsAndConditionsContent() {
  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-24 lg:pb-28 lg:pt-28">
      <div className="container">
        <div className="mx-auto w-full max-w-5xl">
          <article className="landing-panel overflow-hidden rounded-xl">
            <header className="border-b border-[var(--asymmetrix-divider)] px-6 py-8 md:px-10 md:py-10">
              <span className="landing-text-muted text-xs font-medium md:text-sm">
                Last updated {LAST_UPDATED}
              </span>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-text-alternative md:text-base">
                Asymmetrix Summit London 2026
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-text-alternative md:text-4xl lg:text-5xl">
                Booking Terms &amp; Conditions
              </h1>
              <p className="mt-4 text-base leading-relaxed text-text-alternative md:text-lg">
                These Terms &amp; Conditions apply to all bookings for the
                Asymmetrix Summit London 2026 (the &ldquo;Summit&rdquo;), taking
                place on Tuesday 3 November 2026 at Nobu Hotel London Portman
                Square. The Summit is organised by Asymmetrix Ltd
                (&ldquo;Asymmetrix&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
                &ldquo;Customer&rdquo; means the company, organisation or
                individual making the booking; &ldquo;Delegate&rdquo; means each
                named individual registered to attend under that booking.
              </p>
              <p className="mt-4 text-base leading-relaxed text-text-alternative md:text-md">
                All written notices under these Terms &amp; Conditions should be
                sent to{" "}
                <a
                  href={`mailto:${EVENTS_EMAIL}`}
                  className="font-medium text-[var(--asymmetrix-blue-deep)] transition-colors hover:text-[var(--asymmetrix-blue)]"
                >
                  {EVENTS_EMAIL}
                </a>
                .
              </p>
            </header>

            <div className="px-6 py-8 md:px-10 md:py-10">
              {SECTIONS.map((section, index) => (
                <div key={section.heading} className={index === 0 ? "" : "mt-8"}>
                  <h2 className="mb-3 text-lg font-bold text-text-alternative md:text-xl">
                    {section.heading}
                  </h2>
                  <ul className="list-none space-y-3 pl-0 text-base leading-relaxed text-text-alternative md:text-md">
                    {section.clauses.map((clause, clauseIndex) => (
                      <li key={clauseIndex}>{clause}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="landing-press-contact mt-10 rounded-xl px-5 py-4 md:px-6 md:py-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-text-alternative">
                  Asymmetrix Ltd
                </p>
                <a
                  href={`mailto:${EVENTS_EMAIL}`}
                  className="mt-1 inline-block text-base font-medium text-[var(--asymmetrix-blue-deep)] transition-colors hover:text-[var(--asymmetrix-blue)]"
                >
                  {EVENTS_EMAIL}
                </a>
                <a
                  href={SUMMIT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-base font-medium text-[var(--asymmetrix-blue-deep)] transition-colors hover:text-[var(--asymmetrix-blue)]"
                >
                  events.asymmetrixintelligence.com/london-2026
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
