import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "You're confirmed | Asymmetrix Summit London 2026",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  const eventTitle = "Asymmetrix Summit London 2026";
  const venue = "Nobu Hotel London Portman Square";
  const address = "22 Portman Square, London W1H 7BG";
  const dateLabel = "Tuesday 3 November 2026";

  // TODO(Ivan): confirm actual event start/end time — placeholder 09:00–18:00 UK
  const startISO = "20261103T090000";
  const endISO = "20261103T180000";

  const eventDetails = "Your confirmed place at the Asymmetrix Summit London 2026.";

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${startISO}/${endISO}&details=${encodeURIComponent(
    eventDetails
  )}&location=${encodeURIComponent(address)}&ctz=Europe/London`;

  const toDeeplinkDateTime = (dt: string) =>
    `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(
      9,
      11
    )}:${dt.slice(11, 13)}:${dt.slice(13, 15)}`;

  const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    eventTitle
  )}&startdt=${toDeeplinkDateTime(startISO)}&enddt=${toDeeplinkDateTime(
    endISO
  )}&location=${encodeURIComponent(address)}&body=${encodeURIComponent(
    eventDetails
  )}`;

  const mapsUrl = "https://maps.app.goo.gl/R6UJtqZYuSrAsUdg7";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${startISO}`,
    `DTEND:${endISO}`,
    `SUMMARY:${eventTitle}`,
    `LOCATION:${address}`,
    `DESCRIPTION:${eventDetails}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const icsDataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    icsContent
  )}`;

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
          You&rsquo;re confirmed
        </h1>
        <p
          style={{
            fontSize: "16px",
            lineHeight: "25px",
            color: "#000B29",
            margin: "0 0 8px 0",
          }}
        >
          Payment received — your place at the {eventTitle} is booked.
        </p>
        <p
          style={{
            fontSize: "14px",
            lineHeight: "22px",
            color: "#5A6272",
            margin: "0 0 28px 0",
          }}
        >
          A confirmation email with your booking details will be sent to you
          shortly.
        </p>

        <div
          style={{
            background: "#F5F8FF",
            border: "1px solid #ECF0FD",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "28px",
          }}
        >
          <p
            style={{
              margin: "0 0 4px 0",
              fontSize: "15px",
              fontWeight: 600,
              color: "#000B29",
            }}
          >
            {dateLabel}
          </p>
          <p style={{ margin: 0, fontSize: "14px", color: "#5A6272" }}>
            {venue}
            <br />
            {address}
          </p>
        </div>

        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "13px",
            fontWeight: 600,
            color: "#5A6272",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Add to calendar
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <a
            href={gcalUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              padding: "13px 24px",
              background:
                "linear-gradient(135deg,#536FF0 0%,#2B52EE 60%,#133EEC 100%)",
              color: "#FFFFFF",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            Google Calendar
          </a>
          <a
            href={icsDataUrl}
            download="asymmetrix-summit-london-2026.ics"
            style={{
              display: "inline-block",
              padding: "13px 24px",
              border: "1px solid #EBECEE",
              color: "#000B29",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            Apple Calendar
          </a>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              padding: "13px 24px",
              border: "1px solid #EBECEE",
              color: "#000B29",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: "6px",
            }}
          >
            Outlook
          </a>
        </div>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            fontSize: "14px",
            fontWeight: 600,
            color: "#1138D4",
            textDecoration: "none",
            marginBottom: "28px",
          }}
        >
          Get directions →
        </a>

        <p style={{ fontSize: "14px", lineHeight: "22px", color: "#5A6272", margin: 0 }}>
          Any questions, reach us at{" "}
          <a href="mailto:events@asymmetrixintelligence.com" style={{ color: "#1138D4" }}>
            events@asymmetrixintelligence.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
