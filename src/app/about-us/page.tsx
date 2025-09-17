"use client";

import Image from "next/image";
import Head from "next/head";
import HomeHeader from "@/components/HomeHeader";

export default function AboutUs() {
  return (
    <>
      <Head>
        <title>About Us - Asymmetrix | Data & Analytics Intelligence</title>
        <meta
          name="description"
          content="Learn about Asymmetrix's vision to be the source of truth for the Data & Analytics universe. Meet our founder Alex Boden and discover our values of continuous learning and client-centric approach."
        />
        <meta
          name="keywords"
          content="Asymmetrix, Data Analytics, Business Intelligence, Alex Boden, Data Science, Analytics Company, Founder CEO"
        />
        <meta name="author" content="Asymmetrix" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="About Us - Asymmetrix | Data & Analytics Intelligence"
        />
        <meta
          property="og:description"
          content="Learn about Asymmetrix's vision to be the source of truth for the Data & Analytics universe. Meet our founder Alex Boden and our team."
        />
        <meta property="og:image" content="/images/about-hero-bg.png" />
        <meta property="og:url" content="https://asymmetrix.com/about-us" />
        <meta property="og:site_name" content="Asymmetrix" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="About Us - Asymmetrix | Data & Analytics Intelligence"
        />
        <meta
          name="twitter:description"
          content="Learn about Asymmetrix's vision to be the source of truth for the Data & Analytics universe."
        />
        <meta name="twitter:image" content="/images/about-hero-bg.png" />

        {/* Additional SEO */}
        <link rel="canonical" href="https://asymmetrix.com/about-us" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Asymmetrix",
              url: "https://asymmetrix.com",
              logo: "https://asymmetrix.com/icons/logo.svg",
              description:
                "Asymmetrix is the source of truth for the Data & Analytics universe, providing up-to-date information and analysis of all businesses in the sector.",
              founder: {
                "@type": "Person",
                name: "Alex Boden",
                jobTitle: "Founder & CEO",
                sameAs: "https://www.linkedin.com/in/alexanderboden/",
                image: "https://asymmetrix.com/images/a_boden.jpg",
              },
              sameAs: [
                "https://asymmetrixintelligence.substack.com/",
                "https://www.linkedin.com/in/alexanderboden/",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        <HomeHeader />
        {/* Hero Section - Our Vision */}
        <section
          className="relative px-4 py-20"
          style={{
            backgroundImage: "url('/images/about-hero-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            color: "#fff",
            position: "relative",
          }}
        >
          {/* Dark overlay for better text readability */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(31, 58, 147, 0.8) 0%, rgba(11, 26, 60, 0.8) 50%, rgba(4, 11, 28, 0.9) 100%)",
            }}
          ></div>
          <div className="relative z-10 mx-auto max-w-6xl">
            <h1 className="mb-8 text-5xl font-bold md:text-6xl">Our Vision</h1>
            <p className="max-w-4xl text-xl leading-relaxed md:text-2xl">
              Our goal at Asymmetrix is to be the source of truth for the Data &
              Analytics universe, with up-to-date information on and analysis of
              all the businesses in the sector.
            </p>
          </div>
        </section>

        {/* Our Team Section */}
        <section className="px-4 py-20 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-16 text-4xl font-bold text-gray-900 md:text-5xl">
              Our Team
            </h2>

            <div className="grid gap-10 mb-16 md:grid-cols-2">
              <div>
                <h3 className="mb-12 text-3xl font-bold text-gray-900">
                  The Founder
                </h3>

                <div className="p-8 mx-0 max-w-md bg-white rounded-lg shadow-lg">
                  <div className="mb-6">
                    <Image
                      src="/images/a_boden.jpg"
                      alt="Alex Boden"
                      width={300}
                      height={256}
                      className="object-cover w-full h-64 rounded-lg"
                    />
                  </div>
                  <h4 className="mb-2 text-2xl font-bold text-gray-900">
                    Alex Boden
                  </h4>
                  <p className="mb-4 text-gray-600">Founder & CEO</p>
                  <a
                    href="https://www.linkedin.com/in/alexanderboden/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex justify-center items-center w-10 h-10 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                    aria-label="Alex Boden's LinkedIn profile"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <h3 className="mb-12 text-3xl font-bold text-gray-900">
                  Research
                </h3>

                <div className="p-8 mx-0 max-w-md bg-white rounded-lg shadow-lg">
                  <div className="mb-6">
                    <Image
                      src="/images/jared_bochner.jpg"
                      alt="Jared Bochner"
                      width={300}
                      height={256}
                      className="object-cover w-full h-64 rounded-lg"
                    />
                  </div>
                  <h4 className="mb-2 text-2xl font-bold text-gray-900">
                    Jared Bochner
                  </h4>
                  <p className="mb-4 text-gray-600">VP Research</p>
                  <a
                    href="https://www.linkedin.com/in/jaredbochner/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex justify-center items-center w-10 h-10 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                    aria-label="Jared Bochner's LinkedIn profile"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values Section */}
        <section className="px-4 py-20 bg-white">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-12 text-4xl font-bold text-gray-900 md:text-5xl">
              Our Values
            </h2>

            <ul className="space-y-4 text-lg text-gray-700 md:text-xl">
              <li className="flex items-start">
                <span className="mt-1 mr-3 text-blue-600">•</span>
                Never stop learning
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-3 text-blue-600">•</span>
                Be client-centric
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-3 text-blue-600">•</span>
                See a problem, fix a problem
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-3 text-blue-600">•</span>
                Reflect on your own actions
              </li>
              <li className="flex items-start">
                <span className="mt-1 mr-3 text-blue-600">•</span>
                Give your health the attention you deserve
              </li>
            </ul>
          </div>
        </section>

        {/* Come and Join Us Section */}
        <section className="px-4 py-20 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-4xl font-bold text-gray-900 md:text-5xl">
              Come and join us
            </h2>

            <p className="mb-6 text-lg leading-relaxed text-gray-700 md:text-xl">
              We can&apos;t promise large banking style bonuses. Instead, what
              we offer is huge amounts of responsibility, a steep learning
              curve, freedom and trust in your judgement.
            </p>

            <p className="mb-8 text-lg text-gray-700 md:text-xl">
              Curious to know more?
            </p>

            <div className="inline-block text-lg font-medium text-gray-800">
              No open positions currently. But we are always interested in
              talking to great people.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="px-4 py-8"
          style={{
            background:
              "linear-gradient(90deg, #1f3a93 0%, #0b1a3c 50%, #040b1c 100%)",
            color: "#fff",
          }}
        >
          <div className="flex flex-col gap-4 justify-between items-center mx-auto max-w-6xl md:flex-row">
            <div className="flex gap-3 items-center">
              <Image
                src="/icons/logo.svg"
                alt="Asymmetrix Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-sm">
                © 2025 Asymmetrix Ltd. All rights reserved
              </span>
            </div>

            <div className="flex gap-6 items-center">
              <a
                href="#"
                className="text-sm text-gray-300 transition-colors hover:text-white"
              >
                Terms of Use
              </a>
              <a
                href="#"
                className="text-sm text-gray-300 transition-colors hover:text-white"
              >
                Privacy Policy
              </a>
            </div>

            <div className="flex gap-3 items-center">
              <a
                href="#"
                className="text-gray-300 transition-colors hover:text-white"
                aria-label="YouTube"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 transition-colors hover:text-white"
                aria-label="Spotify"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 transition-colors hover:text-white"
                aria-label="Podcast"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 16.568C16.568 17.568 15.568 18 14.568 18H9.432c-1 0-2-.432-2-1.432V7.432C7.432 6.432 8.432 6 9.432 6h5.136c1 0 2 .432 2 1.432v9.136z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-300 transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
