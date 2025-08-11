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
    },
    container: {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      margin: "0 auto",
      gap: "20px",
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
      <div style={styles.container}>
        {/* Left Section: Logo and Text */}
        <div style={styles.leftSection}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.asymmetrixintelligence.com/images/logo.svg"
            alt="Asymmetrix Logo"
            style={styles.logoImage}
          />
          <span style={styles.logoText}>
            © 2025 Asymmetrix Ltd. All rights reserved
          </span>
        </div>

        {/* Center Section: Navigation Links */}
        <div style={styles.centerSection}>
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} style={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right Section: Social Media Icons */}
        <div style={styles.rightSection}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
          >
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
