"use client";

import Link from "next/link";

const Footer = () => {
  const navItems = [
    { label: "Terms of Use", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ];

  const styles = {
    footer: {
      background: "var(--ax-gray-50)",
      color: "var(--fg-2)",
      minHeight: 80,
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
      position: "relative" as const,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box" as const,
      borderTop: "1px solid var(--border-1)",
      fontFamily: "var(--font-sans)",
    },
    container: {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      margin: "0 auto",
      gap: "20px",
      maxWidth: "var(--container-wide)",
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
      fontSize: "var(--fs-14)",
      color: "var(--fg-3)",
    },
    centerSection: {
      display: "flex",
      alignItems: "center",
      gap: "24px",
    },
    navLink: {
      color: "var(--fg-2)",
      fontSize: "var(--fs-14)",
      textDecoration: "none",
    },
    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    socialIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
      borderRadius: "var(--r-md)",
      textDecoration: "none",
      transition: "background var(--dur-fast) var(--ease-out)",
    },
  } as const;

  return (
    <footer className="ax-site-footer" style={styles.footer}>
      <style jsx>{`
        @media (max-width: 767px) {
          .footer-container {
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
            padding: 16px 0 !important;
            text-align: center !important;
            max-width: 100% !important;
          }
          .footer-center {
            order: 3;
          }
          .footer-right {
            order: 2;
          }
          .footer-left {
            order: 1;
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
        }
        .footer-nav-link:hover {
          color: var(--ax-cyan-700);
        }
        .footer-social-link:hover {
          background: var(--ax-gray-100);
        }
      `}</style>
      <div style={styles.container} className="footer-container">
        <div style={styles.leftSection} className="footer-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.svg"
            alt="Asymmetrix Logo"
            style={styles.logoImage}
          />
          <span style={styles.logoText}>
            © 2026 Asymmetrix Ltd. All rights reserved
          </span>
        </div>

        <div style={styles.centerSection} className="footer-center">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={styles.navLink}
              className="footer-nav-link"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div style={styles.rightSection} className="footer-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://www.youtube.com/@AsymmetrixIntelligence"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            className="footer-social-link"
            aria-label="YouTube"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/youtube.svg" alt="" width={18} height={18} />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://open.spotify.com/show/1gvtMQL2O38ZhEuYyIoKL0"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            className="footer-social-link"
            aria-label="Spotify"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/spotify.svg" alt="" width={18} height={18} />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://podcasts.apple.com/gb/podcast/asymmetrix/id1777231528"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            className="footer-social-link"
            aria-label="Apple Podcasts"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/podcast.svg" alt="" width={18} height={18} />
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://www.linkedin.com/company/asymmetrixintelligence"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            className="footer-social-link"
            aria-label="LinkedIn"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/linkedin.svg" alt="" width={18} height={18} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
