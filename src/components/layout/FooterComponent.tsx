import Link from "next/link";

export default function FooterComponent() {
  return (
    <footer className="text-white bg-gray-900">
      <div className="py-12 container-custom">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <span className="text-2xl font-bold text-white">Asymmetrix</span>
            </div>
            <p className="mb-4 max-w-md text-gray-300">
              Professional financial advisory services, investment management,
              and market analysis for individuals and businesses seeking
              strategic financial solutions.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 transition-colors hover:text-white"
              >
                <span className="sr-only">LinkedIn</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-gray-400 transition-colors hover:text-white"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about-us"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/advisors"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Advisors
                </Link>
              </li>
              <li>
                <Link
                  href="/companies"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Companies
                </Link>
              </li>
              <li>
                <Link
                  href="/insights-analysis"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Insights & Analysis
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/individuals"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Individual Services
                </Link>
              </li>
              <li>
                <Link
                  href="/investors"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Investment Services
                </Link>
              </li>
              <li>
                <Link
                  href="/sectors"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Sector Analysis
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-gray-300 transition-colors hover:text-white"
                >
                  Client Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-gray-800">
          <div className="flex flex-col justify-between items-center md:flex-row">
            <p className="text-sm text-gray-400">
              © 2024 Asymmetrix. All rights reserved.
            </p>
            <div className="flex mt-4 space-x-6 md:mt-0">
              <Link
                href="/privacy"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="text-sm text-gray-400 transition-colors hover:text-white"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
