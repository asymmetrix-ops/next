import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Payment not completed | Asymmetrix Summit London 2026",
  robots: { index: false, follow: false },
};

export default function PaymentCancelledPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F8FC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#FFFFFF",
          border: "1px solid #EBECEE",
          borderTop: "3px solid #536FF0",
          borderRadius: "4px",
          padding: "44px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "32px",
          }}
        >
          <Image src="/icons/logo.svg" alt="Asymmetrix" width={28} height={28} />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              color: "#000B29",
            }}
          >
            ASYMMETRIX{" "}
            <span
              style={{ fontWeight: 400, color: "#536FF0", letterSpacing: "1px" }}
            >
              Summit
            </span>
          </span>
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "#000B29",
            margin: "0 0 12px 0",
          }}
        >
          Payment not completed
        </h1>
        <p
          style={{
            fontSize: "16px",
            lineHeight: "25px",
            color: "#000B29",
            margin: "0 0 8px 0",
          }}
        >
          Your booking wasn&rsquo;t confirmed and you haven&rsquo;t been charged.
        </p>
        <p
          style={{
            fontSize: "16px",
            lineHeight: "25px",
            color: "#000B29",
            margin: "0 0 28px 0",
          }}
        >
          If you&rsquo;d like to try again or run into any issues, just reply to
          your confirmation email or get in touch below.
        </p>

        <p style={{ fontSize: "14px", lineHeight: "22px", color: "#5A6272", margin: 0 }}>
          <a href="mailto:events@asymmetrixintelligence.com" style={{ color: "#1138D4" }}>
            events@asymmetrixintelligence.com
          </a>
        </p>
      </div>
    </div>
  );
}
