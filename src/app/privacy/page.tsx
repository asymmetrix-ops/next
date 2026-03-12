import { Metadata } from "next";
import HomeHeader from "@/components/HomeHeader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Asymmetrix Intelligence",
  description:
    "Read the Asymmetrix Intelligence privacy policy, including how personal information is collected, used, shared, retained, and protected.",
  alternates: {
    canonical: "https://asymmetrix.com/privacy",
  },
};

type PrivacySubsection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type PrivacySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  closingParagraphs?: string[];
  subsections?: PrivacySubsection[];
  contactLines?: string[];
};

const sections: PrivacySection[] = [
  {
    title: "1. Introduction",
    paragraphs: [
      'This Privacy Policy describes how Asymmetrix Intelligence ("we," "our," or "us") collects, uses, discloses, and protects personal information when you access or use our online data provider services, website, applications, and related platforms (collectively, the "Services"). We are committed to safeguarding your privacy and ensuring that your personal data is handled responsibly and in compliance with applicable data protection laws.',
      "By accessing or using our Services, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with our practices, please do not use our Services.",
    ],
  },
  {
    title: "2. Information We Collect",
    subsections: [
      {
        title: "2.1 Information You Provide Directly",
        paragraphs: [
          "We may collect personal information that you voluntarily provide when using our Services, including:",
        ],
        items: [
          "Account registration details such as your name, email address, phone number, and company name.",
          "Billing and payment information, including credit card details and billing addresses.",
          "Communications you send to us, such as support requests, feedback, and enquiries.",
          "Information included in API access requests, account preferences, and custom data configurations.",
        ],
      },
      {
        title: "2.2 Information Collected Automatically",
        paragraphs: [
          "When you interact with our Services, we automatically collect certain technical and usage data, including:",
        ],
        items: [
          "Device information (browser type, operating system, device identifiers).",
          "Log data such as IP addresses, access times, pages viewed, and referring URLs.",
          "Usage patterns, search queries, API call frequency, and feature interactions.",
          "Cookies, web beacons, and similar tracking technologies (see Section 7).",
        ],
      },
      {
        title: "2.3 Information from Third Parties",
        paragraphs: [
          "We may receive personal data from third-party sources, including business partners, data brokers, publicly available databases, social media platforms, and identity verification services, to supplement the information we collect directly.",
        ],
      },
    ],
  },
  {
    title: "3. How We Use Your Information",
    paragraphs: ["We use the information we collect for the following purposes:"],
    items: [
      "Providing, maintaining, and improving our data services and platform functionality.",
      "Processing transactions, managing subscriptions, and administering your account.",
      "Communicating with you regarding service updates, technical notices, and customer support.",
      "Personalising your experience and delivering relevant content and recommendations.",
      "Conducting analytics and research to enhance service quality and develop new features.",
      "Detecting, preventing, and addressing fraud, security incidents, and technical issues.",
      "Complying with legal obligations, responding to lawful requests, and enforcing our agreements.",
      "Marketing and promotional activities, subject to your preferences and applicable law.",
    ],
  },
  {
    title: "4. Legal Basis for Processing",
    paragraphs: [
      "Where applicable (including under the UK GDPR, EU GDPR, and similar regulations), we process personal data based on one or more of the following legal grounds:",
    ],
    items: [
      "Contractual Necessity: To perform our obligations under our agreement with you.",
      "Legitimate Interests: To operate and improve our Services, provided this does not override your fundamental rights.",
      "Consent: Where you have given us explicit permission for specific processing activities.",
      "Legal Obligation: To comply with applicable laws, regulations, or court orders.",
    ],
  },
  {
    title: "5. Data Sharing and Disclosure",
    paragraphs: [
      "We do not sell your personal information. We may share your data in the following circumstances:",
    ],
    items: [
      "Service Providers: We engage trusted third-party vendors who perform services on our behalf, such as hosting, payment processing, analytics, and customer support. These providers are contractually bound to protect your data.",
      "Business Partners: With your consent or as necessary to deliver integrated services, we may share data with business partners and channel affiliates.",
      "Legal Requirements: We may disclose your information if required by law, legal process, or governmental request, or to protect the rights, property, or safety of our company, users, or the public.",
      "Corporate Transactions: In connection with a merger, acquisition, reorganisation, or sale of assets, your data may be transferred as part of the transaction, subject to standard confidentiality obligations.",
      "Aggregated or De-Identified Data: We may share aggregated, anonymised, or de-identified data that cannot reasonably identify you for research, analytics, or marketing purposes.",
    ],
  },
  {
    title: "6. Data Retention",
    paragraphs: [
      "We retain personal data for as long as necessary to fulfil the purposes described in this policy, unless a longer retention period is required or permitted by law. Retention periods are determined based on the nature of the data, the purposes of processing, applicable legal requirements, and our legitimate business needs. When personal data is no longer needed, we will securely delete or anonymise it in accordance with our data retention schedule.",
    ],
  },
  {
    title: "7. Cookies and Tracking Technologies",
    paragraphs: [
      "We use cookies and similar technologies to enhance functionality, analyse usage, and deliver targeted content. The types of cookies we use include:",
    ],
    items: [
      "Essential Cookies: Required for the basic operation of our Services (e.g., session management and authentication).",
      "Analytics Cookies: Help us understand how users interact with our platform, enabling continuous improvement.",
      "Functional Cookies: Remember your preferences and settings for a more personalised experience.",
      "Advertising Cookies: Used to deliver relevant advertisements and measure campaign effectiveness.",
    ],
    closingParagraphs: [
      "You can manage your cookie preferences through your browser settings or our cookie consent tool. Disabling certain cookies may affect the functionality of our Services.",
    ],
  },
  {
    title: "8. Data Security",
    paragraphs: [
      "We implement industry-standard technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These measures include encryption in transit and at rest, access controls, regular security assessments, employee training, and incident response protocols. While we strive to protect your data, no method of transmission or storage is completely secure. We encourage you to take steps to safeguard your account credentials.",
    ],
  },
  {
    title: "9. International Data Transfers",
    paragraphs: [
      "Your personal data may be transferred to and processed in countries other than your country of residence, including countries that may not provide the same level of data protection. Where such transfers occur, we implement appropriate safeguards, such as Standard Contractual Clauses (SCCs), Binding Corporate Rules, or other approved mechanisms, to ensure that your data receives an adequate level of protection in accordance with applicable law.",
    ],
  },
  {
    title: "10. Your Rights and Choices",
    paragraphs: [
      "Depending on your location and applicable law, you may have the following rights regarding your personal data:",
    ],
    items: [
      "Access: Request a copy of the personal data we hold about you.",
      "Rectification: Request correction of inaccurate or incomplete data.",
      "Erasure: Request deletion of your personal data, subject to legal exceptions.",
      "Restriction: Request that we limit the processing of your data in certain circumstances.",
      "Portability: Request a machine-readable copy of your data for transfer to another provider.",
      "Objection: Object to processing based on legitimate interests or for direct marketing purposes.",
      "Withdraw Consent: Withdraw previously given consent at any time, without affecting the lawfulness of prior processing.",
    ],
    closingParagraphs: [
      "To exercise any of these rights, please contact us at asymmetrix@asymmetrixintelligence.com. We will respond to verified requests within the timeframe required by applicable law. You also have the right to lodge a complaint with your local data protection authority.",
    ],
  },
  {
    title: "11. Children's Privacy",
    paragraphs: [
      "Our Services are not directed to individuals under the age of 16 (or the applicable age of consent in your jurisdiction). We do not knowingly collect personal data from children. If we become aware that we have inadvertently collected information from a child, we will take prompt steps to delete such data. If you believe a child has provided us with personal information, please contact us immediately.",
    ],
  },
  {
    title: "12. Third-Party Links and Services",
    paragraphs: [
      "Our Services may contain links to third-party websites, applications, or services that are not operated or controlled by us. This Privacy Policy does not apply to those third-party services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you access through our platform.",
    ],
  },
  {
    title: "13. Changes to This Privacy Policy",
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or industry standards. When we make material changes, we will notify you by posting the updated policy on our website and updating the "Effective Date" at the top. Where required by law, we will seek your consent before applying significant changes. We encourage you to review this policy periodically.',
    ],
  },
  {
    title: "14. Contact Us",
    paragraphs: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:",
    ],
    contactLines: [
      "Asymmetrix Intelligence",
      "Attn: Data Protection Officer / Privacy Team",
      "Calder & Co",
      "30 Orange Street",
      "London, United Kingdom, WC2H 7HF",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader />

      <main>
        <section className="px-4 py-16 bg-slate-950 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] uppercase text-slate-300">
              Legal
            </p>
            <h1 className="text-4xl font-bold md:text-5xl">Privacy Policy</h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              This page explains how Asymmetrix Intelligence collects,
              uses, shares, and protects personal information across our
              services and platforms.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
            <div className="space-y-10 text-slate-700">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {section.title}
                  </h2>

                  <div className="mt-4 space-y-4">
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph} className="leading-7">
                        {paragraph}
                      </p>
                    ))}

                    {section.subsections?.map((subsection) => (
                      <div key={subsection.title} className="space-y-4">
                        <h3 className="pt-2 text-xl font-semibold text-slate-900">
                          {subsection.title}
                        </h3>
                        {subsection.paragraphs?.map((paragraph) => (
                          <p key={paragraph} className="leading-7">
                            {paragraph}
                          </p>
                        ))}
                        {subsection.items && (
                          <ul className="space-y-3 pl-6 list-disc">
                            {subsection.items.map((item) => (
                              <li key={item} className="leading-7">
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}

                    {section.items && (
                      <ul className="space-y-3 pl-6 list-disc">
                        {section.items.map((item) => (
                          <li key={item} className="leading-7">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.closingParagraphs?.map((paragraph) => (
                      <p key={paragraph} className="leading-7">
                        {paragraph}
                      </p>
                    ))}

                    {section.contactLines && (
                      <div className="space-y-1 leading-7">
                        {section.contactLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        <p>
                          Email:{" "}
                          <a
                            href="mailto:asymmetrix@asymmetrixintelligence.com"
                            className="font-medium text-slate-900 underline underline-offset-4"
                          >
                            asymmetrix@asymmetrixintelligence.com
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
