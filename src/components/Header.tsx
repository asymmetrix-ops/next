"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { trackLogout } from "@/lib/tracking";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isTrialActive, user, logout } = useAuth();
  const pathname = usePathname();
  const isAllowedTrialRoute = (href: string) =>
    href === "/home-user" || href === "/insights-analysis";

  const handleLogout = () => {
    const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
    trackLogout(Number.isFinite(userId) ? userId : 0);
    logout();
    router.push("/login");
  };

  const navItems = [
    "Dashboard",
    "Companies",
    "Sectors",
    "Investors",
    "Advisors",
    "Individuals",
    "Corporate Events",
    "Insights & Analysis",
  ];

  const styles = {
    header: {
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "16.5px 0px",
      position: "relative" as const,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box" as const,
    },
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0px 32px",
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box" as const,
    },
    leftSection: {
      display: "flex",
      alignItems: "center",
      gap: "0px",
    },
    logo: {
      width: "48px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    nav: {
      display: "flex",
      gap: "32px",
      "@media (max-width: 1024px)": {
        gap: "20px",
      },
    },
    navDesktop: {
      display: "flex",
      gap: "4px",
    },
    navMobile: {
      display: "none",
      position: "absolute" as const,
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "16px 24px",
      flexDirection: "column" as const,
      gap: "16px",
      zIndex: 1000,
    },
    navMobileOpen: {
      display: "flex",
      position: "absolute" as const,
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "16px 24px",
      flexDirection: "column" as const,
      gap: "16px",
      zIndex: 1000,
    },
    navLink: {
      fontSize: "14px",
      fontWeight: "500",
      textDecoration: "none",
      transition: "color 0.2s",
      padding: "12px 8px",
      position: "relative" as const,
      whiteSpace: "nowrap",
    },
    navLinkMobile: {
      fontSize: "16px",
      fontWeight: "500",
      textDecoration: "none",
      transition: "color 0.2s",
      padding: "12px 0",
      borderBottom: "1px solid #f3f4f6",
    },
    activeLink: {
      color: "#595959",
      paddingBottom: "14px",
    },
    inactiveLink: {
      color: "#6b7280",
    },
    rightSection: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    logoutButton: {
      fontSize: "14px",
      color: "#595959",
      background: "none",
      border: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    hamburger: {
      display: "none",
      flexDirection: "column" as const,
      cursor: "pointer",
      padding: "4px",
      gap: "3px",
    },
    hamburgerLine: {
      width: "20px",
      height: "2px",
      backgroundColor: "#6b7280",
      transition: "all 0.3s",
    },
  };

  return (
    <>
      <style jsx>{`
        @media (max-width: 767px) {
          .nav-desktop {
            display: none !important;
          }
          .hamburger {
            display: flex !important;
          }
          .left-section {
            gap: 16px !important;
          }
          .header-container {
            padding: 0 16px !important;
          }
        }
        @media (min-width: 768px) {
          .nav-mobile {
            display: none !important;
          }
        }
        @media (max-width: 1023px) {
          .nav-desktop {
            gap: 20px !important;
          }
          .nav-link {
            font-size: 13px !important;
          }
        }
        @media (max-width: 900px) {
          .nav-desktop {
            gap: 16px !important;
          }
          .nav-link {
            font-size: 12px !important;
          }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.container} className="header-container">
          <div style={styles.leftSection} className="left-section">
            {/* Logo */}
            <Link
              href="/"
              style={styles.logo}
              onClick={(e) => {
                if (isTrialActive) {
                  e.preventDefault();
                  router.push("/home-user");
                }
              }}
            >
              <Image
                src="/icons/logo.svg"
                alt="Logo"
                width={48}
                height={48}
                style={{
                  objectFit: "contain",
                }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav style={styles.navDesktop} className="nav-desktop">
              {navItems.map((item) => {
                const getHref = (item: string) => {
                  const label = item.replace(/\u00A0/g, " ");
                  switch (label) {
                    case "Dashboard":
                      return "/home-user";
                    case "Companies":
                      return "/companies";
                    case "Sectors":
                      return "/sectors";
                    case "Investors":
                      return "/investors";
                    case "Advisors":
                      return "/advisors";
                    case "Individuals":
                      return "/individuals";
                    case "Corporate Events":
                      return "/corporate-events";
                    case "Insights & Analysis":
                      return "/insights-analysis";
                    default:
                      if (/^insights/i.test(label)) return "/insights-analysis";
                      return "#";
                  }
                };

                const href = getHref(item);
                const isDisabled = isTrialActive && !isAllowedTrialRoute(href);

                return (
                  <Link
                    key={item}
                    href={href}
                    style={{
                      ...styles.navLink,
                      ...(pathname === href
                        ? styles.activeLink
                        : styles.inactiveLink),
                    }}
                    className="nav-link"
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                    }}
                    onMouseOver={(e) => {
                      if (pathname !== href) {
                        (e.target as HTMLElement).style.color = "#111827";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (pathname !== href) {
                        (e.target as HTMLElement).style.color = "#6b7280";
                      }
                    }}
                  >
                    {item}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div style={styles.rightSection}>
            {/* Log out */}
            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              onMouseOver={(e) =>
                ((e.target as HTMLElement).style.color = "#111827")
              }
              onMouseOut={(e) =>
                ((e.target as HTMLElement).style.color = "#6b7280")
              }
            >
              Log out
            </button>

            {/* Hamburger Menu */}
            <div
              style={styles.hamburger}
              className="hamburger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <div
                style={{
                  ...styles.hamburgerLine,
                  transform: isMobileMenuOpen
                    ? "rotate(45deg) translate(5px, 5px)"
                    : "none",
                }}
              ></div>
              <div
                style={{
                  ...styles.hamburgerLine,
                  opacity: isMobileMenuOpen ? 0 : 1,
                }}
              ></div>
              <div
                style={{
                  ...styles.hamburgerLine,
                  transform: isMobileMenuOpen
                    ? "rotate(-45deg) translate(7px, -6px)"
                    : "none",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav
          style={isMobileMenuOpen ? styles.navMobileOpen : styles.navMobile}
          className="nav-mobile"
        >
          {navItems.map((item) => {
            const getHref = (item: string) => {
              const label = item.replace(/\u00A0/g, " ");
              switch (label) {
                case "Dashboard":
                  return "/home-user";
                case "Companies":
                  return "/companies";
                case "Sectors":
                  return "/sectors";
                case "Investors":
                  return "/investors";
                case "Advisors":
                  return "/advisors";
                case "Individuals":
                  return "/individuals";
                case "Corporate Events":
                  return "/corporate-events";
                case "Insights & Analysis":
                  return "/insights-analysis";
                default:
                  if (/^insights/i.test(label)) return "/insights-analysis";
                  return "#";
              }
            };

            const href = getHref(item);
            const isDisabled = isTrialActive && !isAllowedTrialRoute(href);

            return (
              <Link
                key={item}
                href={href}
                style={{
                  ...styles.navLinkMobile,
                  ...(pathname === href
                    ? { color: "#595959", fontWeight: "600" }
                    : { color: "#6b7280" }),
                }}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    return;
                  }

                  setIsMobileMenuOpen(false);
                }}
              >
                {item}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
};

export default Header;
