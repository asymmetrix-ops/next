"use client";

import Image from "next/image";
import CalendlyEmbed from "@/components/CalendlyEmbed";

interface ProspectConversionCardProps {
  email?: string | null;
  /** When true, renders as a full-screen overlay (entity page gate). */
  overlay?: boolean;
}

export default function ProspectConversionCard({
  email,
  overlay = true,
}: ProspectConversionCardProps) {
  const card = (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <div className="flex-shrink-0 rounded-t-2xl px-8 pt-8 pb-6 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="flex items-center gap-3 mb-5">
          <Image
            src="/icons/logo.svg"
            alt="Asymmetrix"
            width={36}
            height={36}
            style={{ borderRadius: "50%" }}
          />
          <span className="text-white font-bold text-lg tracking-wide">
            ASYMMETRIX
          </span>
        </div>
        <h2 className="text-white text-2xl font-bold leading-tight">
          Want to access this — and plenty more?
        </h2>
        <p className="text-blue-100 text-sm mt-2 leading-relaxed">
          Book a slot with our Sales Team to unlock full access to Data &amp;
          Analytics sector intelligence.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-b-2xl">
        <CalendlyEmbed email={email} />
      </div>
    </div>
  );

  if (!overlay) return card;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh]">{card}</div>
    </div>
  );
}
