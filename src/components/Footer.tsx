"use client";

import Link from "next/link";

const Footer = () => {
  const navItems = [
    { label: "Terms of Use", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ];

  const styles = {
    footer: {
      background: "#0f172a",
      color: "#e5e7eb",
      minHeight: 80,
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      position: "relative" as const,
    },
    container: {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      margin: "0 auto",
      gap: "20px",
      maxWidth: 1280,
    },
    leftSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    logoImage: {
      width: "28px",
      height: "28px",
      borderRadius: "50%",
    },
    logoText: {
      fontSize: "14px",
      color: "#cbd5e1",
    },
    centerSection: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    navLink: {
      color: "#cbd5e1",
      fontSize: "14px",
      textDecoration: "none",
    },
    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    socialIcon: {
      color: "#cbd5e1",
      fontSize: "18px",
      textDecoration: "none",
    },
  } as const;

  return (
    <footer style={styles.footer}>
      <style jsx>{`
        @media (max-width: 767px) {
          .footer-container {
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px 0 !important;
            text-align: center !important;
          }
          .footer-center {
            order: 3;
          }
          .footer-right {
            order: 2;
          }
          .footer-left {
            order: 1;
          }
        }
      `}</style>
      <div style={styles.container} className="footer-container">
        {/* Left Section: Logo and Text */}
        <div style={styles.leftSection} className="footer-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.svg"
            alt="Asymmetrix Logo"
            style={styles.logoImage}
          />
          <span style={styles.logoText}>
            © 2025 Asymmetrix Ltd. All rights reserved
          </span>
        </div>

        {/* Center Section: Navigation Links */}
        <div style={styles.centerSection} className="footer-center">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} style={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Section: Social Media Icons */}
        <div style={styles.rightSection} className="footer-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/youtube.svg"
              alt="YouTube"
              width={18}
              height={18}
            />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://open.spotify.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/spotify.svg"
              alt="Spotify"
              width={18}
              height={18}
            />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://podcasts.apple.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/podcast.svg"
              alt="Podcast"
              width={18}
              height={18}
            />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://www.linkedin.com/company/asymmetrixintelligence/posts/?feedView=all"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/linkedin.svg"
              alt="LinkedIn"
              width={18}
              height={18}
            />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
