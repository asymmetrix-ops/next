"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LANDING_HOME = "/landing-test-version1";

/**
 * @param {{
 *   sectionId: string;
 *   className?: string;
 *   children: React.ReactNode;
 * }} props
 */
export function LandingAnchorLink({ sectionId, className, children }) {
  const pathname = usePathname();
  const href = `${LANDING_HOME}#${sectionId}`;

  if (pathname === LANDING_HOME) {
    return (
      <a
        href={`#${sectionId}`}
        className={className}
        onClick={(event) => {
          event.preventDefault();
          scrollToHash(sectionId);
          window.history.replaceState(null, "", `#${sectionId}`);
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function scrollToHash(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
