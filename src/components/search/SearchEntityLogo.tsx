"use client";

import { useEffect, useState } from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";

export function SearchEntityLogo({
  logo,
  name,
}: {
  logo: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveCompanyLogoSrc(logo);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="company-logo-cell">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} logo`}
          width={60}
          height={40}
          className="company-logo"
          style={{ objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="company-logo-placeholder">No Logo</div>
      )}
    </div>
  );
}
