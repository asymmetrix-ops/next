import React from "react";
import Image from "next/image";

interface CompanyLogoProps {
  logo: string;
  name: string;
  size?: number;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ logo, name, size = 40 }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="company-logo"
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: "1px solid #e2e8f0",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: "#f7fafc",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#64748b",
        border: "1px solid #e2e8f0",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export default React.memo(CompanyLogo);
