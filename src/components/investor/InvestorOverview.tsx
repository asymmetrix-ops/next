import React from "react";
import type { InvestorData } from "@/types/investor";
import {
  formatNumber,
  formatDate,
  formatLocation,
} from "@/utils/investorHelpers";

interface InvestorOverviewProps {
  investorData: InvestorData;
}

const InvestorOverview: React.FC<InvestorOverviewProps> = ({
  investorData,
}) => {
  const { Investor, Focus, Invested_DA_sectors } = investorData;
  const hq = formatLocation(Investor._locations);

  return (
    <div style={{ flex: "1", minWidth: "300px" }}>
      {/* Overview Section */}
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Overview
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div>
            <strong>Focus:</strong>{" "}
            {Focus.map((f) => f.sector_name).join(", ") || "Not available"}
          </div>
          <div>
            <strong>Year founded:</strong>{" "}
            {Investor._years?.Year || "Not available"}
          </div>
          <div>
            <strong>HQ:</strong> {hq || "Not available"}
          </div>
          <div>
            <strong>Website:</strong>{" "}
            {Investor.url ? (
              <a
                href={Investor.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3b82f6", textDecoration: "none" }}
              >
                {Investor.url}
              </a>
            ) : (
              "Not available"
            )}
          </div>
          <div>
            <strong>LinkedIn Members:</strong>{" "}
            {formatNumber(
              Investor._linkedin_data_of_new_company?.linkedin_employee
            )}
          </div>
          <div>
            <strong>LinkedIn Members Date:</strong>{" "}
            {formatDate(
              Investor._linkedin_data_of_new_company?.linkedin_emp_date
            )}
          </div>
        </div>
      </div>

      {/* Invested D&A Sectors Section */}
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Invested D&A sectors:
        </h2>
        <div>
          {Invested_DA_sectors.length > 0
            ? Invested_DA_sectors.map((sector, index) => (
                <span key={sector.id}>
                  <a
                    href={`/sector/${sector.id}`}
                    style={{ color: "#3b82f6", textDecoration: "none" }}
                  >
                    {sector.sector_name}
                  </a>
                  {index < Invested_DA_sectors.length - 1 ? ", " : ""}
                </span>
              ))
            : "Not available"}
        </div>
      </div>

      {/* Description Section */}
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Description:
        </h2>
        <div style={{ whiteSpace: "pre-wrap" }}>
          {Investor.description || "Not available"}
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvestorOverview);
