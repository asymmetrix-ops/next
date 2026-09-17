import type { Metadata } from "next";
import Image from "next/image";
import {
  LONDON_2026_EVENT,
  LONDON_2026_SCHEDULE,
} from "@/lib/events/london-2026-calendar";

export const metadata: Metadata = {
  title: "Registration confirmed | Asymmetrix London Summit 2026",
  robots: { index: false, follow: false },
};

const sectionLabelStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: "13px",
  fontWeight: 600,
  color: "#5A6272",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const bodyStyle: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "25px",
  color: "#000B29",
  margin: 0,
};

export default function PaymentSuccessPage() {
  const {
    title: eventTitle,
    venue,
    address,
    dateLabel,
    startLocal: startISO,
    endLocal: endISO,
    description: eventDetails,
    icsFilename,
  } = LONDON_2026_EVENT;

  const locationLine = `${venue}, ${address}`;
  const icsUrl = "/events/london-2026/calendar.ics";

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${startISO}/${endISO}&details=${encodeURIComponent(
    eventDetails
  )}&location=${encodeURIComponent(locationLine)}&ctz=Europe/London`;

  const toDeeplinkDateTime = (dt: string) =>
    `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(
      9,
      11
    )}:${dt.slice(11, 13)}:${dt.slice(13, 15)}`;

  const outlookUrl = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    eventTitle
  )}&startdt=${toDeeplinkDateTime(startISO)}&enddt=${toDeeplinkDateTime(
    endISO
  )}&location=${encodeURIComponent(locationLine)}&body=${encodeURIComponent(
    eventDetails
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

        <p style={{ ...bodyStyle, marginBottom: "12px" }}>
          Thank you for registering for the {eventTitle}.
        </p>
        <p style={{ ...bodyStyle, marginBottom: "28px" }}>
          Your registration is now confirmed and we are looking forward to
          welcoming you.
        </p>

        <p style={{ ...sectionLabelStyle, marginBottom: "16px" }}>
          Event details
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
              margin: "0 0 8px 0",
              fontSize: "15px",
              fontWeight: 600,
              color: "#000B29",
            }}
          >
            {eventTitle}
          </p>
          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: "15px",
              fontWeight: 600,
              color: "#000B29",
            }}
          >
            {dateLabel}
          </p>
          <ul
            style={{
              margin: "0 0 16px 0",
              padding: "0 0 0 18px",
              fontSize: "14px",
              lineHeight: "22px",
              color: "#5A6272",
            }}
          >
            {LONDON_2026_SCHEDULE.map((item) => (
              <li key={item.time} style={{ marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, color: "#000B29" }}>
                  {item.time}
                </span>
                {" — "}
                {item.label}
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, fontSize: "14px", lineHeight: "22px", color: "#5A6272" }}>
            {venue}
            <br />
            {address}
          </p>
        </div>

        <p style={sectionLabelStyle}>Add to calendar</p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "28px",
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
            href={icsUrl}
            download={icsFilename}
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

        <p
          style={{
            fontSize: "14px",
            lineHeight: "22px",
            color: "#5A6272",
            margin: "0 0 24px 0",
          }}
        >
          We&rsquo;ll be in touch with further details in due course. If you have
          any questions in the meantime, please feel free to reach out to our
          team at{" "}
          <a
            href="mailto:events@asymmetrixintelligence.com"
            style={{ color: "#1138D4" }}
          >
            events@asymmetrixintelligence.com
          </a>
          .
        </p>

        <p
          style={{
            fontSize: "14px",
            lineHeight: "22px",
            color: "#5A6272",
            margin: 0,
          }}
        >
          Kind regards,
          <br />
          Asymmetrix team
        </p>
      </div>
    </div>
  );
}
