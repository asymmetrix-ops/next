"use client";

import Link from "next/link";
import { useState } from "react";

const Footer = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const navItems = ["Terms of Use", "Privacy Policy"];

  const styles = {
    footer: {
      borderTop: "1px solid #e5e7eb",
      padding: "32px 24px",
      position: "relative" as const,
    },
    container: {
      display: "flex",
      flexDirection: "row" as const,
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      margin: "0 auto",
      flexWrap: "wrap" as const,
      gap: "20px",
    },
    leftSection: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    logoImage: {
      width: "42px",
      height: "42px",
    },
    logoText: {
      fontSize: "14px",
      color: "#6b7280",
    },
    centerSection: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    navLink: {
      color: "#6b7280",
      fontSize: "14px",
      textDecoration: "none",
      transition: "color 0.2s",
      "&:hover": {
        color: "#111827",
      },
    },
    activeLink: {
      color: "#111827",
      fontWeight: "600",
    },
    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    socialIcon: {
      color: "#6b7280",
      fontSize: "18px",
      textDecoration: "none",
      transition: "color 0.2s",
    },
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* Left Section: Logo and Text */}
        <div style={styles.leftSection}>
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
            <Link
              key={item}
              href="#"
              style={{
                ...styles.navLink,
                ...(activeTab === item ? styles.activeLink : {}),
              }}
              onClick={() => setActiveTab(item)}
              onMouseOver={(e) => {
                if (activeTab !== item)
                  (e.target as HTMLElement).style.color = "#111827";
              }}
              onMouseOut={(e) => {
                if (activeTab !== item)
                  (e.target as HTMLElement).style.color = "#6b7280";
              }}
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Right Section: Social Media Icons */}
        <div style={styles.rightSection}>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.color = "#FF0000")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.color = "#6b7280")
            }
          >
            ▶️
          </a>
          <a
            href="https://open.spotify.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.color = "#1DB954")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.color = "#6b7280")
            }
          >
            🎧
          </a>
          <a
            href="https://podcasts.apple.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.color = "#9146FF")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.color = "#6b7280")
            }
          >
            🎙️
          </a>
          <a
            href="https://www.linkedin.com/company/asymmetrix"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.socialIcon}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.color = "#0077B5")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.color = "#6b7280")
            }
          >
            Ⓛ
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
