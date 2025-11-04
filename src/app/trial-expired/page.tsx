"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 py-10 mx-auto w-full max-w-3xl">
        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Trial expired
          </h1>
          <p className="mb-4 text-gray-700">
            Your 3-day trial has ended. To continue accessing Asymmetrix
            Intelligence, please upgrade your plan.
          </p>
          <div className="flex gap-3 items-center">
            <Link
              href="/login"
              className="inline-flex justify-center items-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Log in
            </Link>
            <a
              href="https://www.asymmetrixintelligence.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex justify-center items-center px-4 py-2 font-semibold text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Contact sales
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
