"use client";

import Image from "next/image";

export function SearchEntityLogo({
  logo,
  name,
}: {
  logo: string;
  name: string;
}) {
  return (
    <div className="company-logo-cell">
      {logo ? (
        <Image
          src={`data:image/jpeg;base64,${logo}`}
          alt={`${name} logo`}
          width={60}
          height={40}
          className="company-logo"
          style={{ objectFit: "contain" }}
        />
      ) : (
        <div className="company-logo-placeholder">No Logo</div>
      )}
    </div>
  );
}
