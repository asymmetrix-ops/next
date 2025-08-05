import React from "react";
import type { TeamMember } from "@/types/investor";

interface InvestmentTeamProps {
  currentTeam: TeamMember[];
  pastTeam: TeamMember[];
}

const InvestmentTeam: React.FC<InvestmentTeamProps> = ({
  currentTeam,
  pastTeam,
}) => {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "24px",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <h2
        style={{
          margin: "0 0 16px 0",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        Investment Team
      </h2>

      {/* Current Team */}
      <div style={{ marginBottom: "16px" }}>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Current:
        </h3>
        {currentTeam.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {currentTeam.map((member, index) => (
              <div key={index}>
                {member.current_employer_url ? (
                  <a
                    href={member.current_employer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none" }}
                  >
                    {member.Individual_text}
                  </a>
                ) : (
                  <span>{member.Individual_text}</span>
                )}
                : {member.job_titles_id.map((jt) => jt.job_title).join(", ")}
              </div>
            ))}
          </div>
        ) : (
          <div>Not available</div>
        )}
      </div>

      {/* Past Team */}
      <div>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          Past:
        </h3>
        {pastTeam.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {pastTeam.map((member, index) => (
              <div key={index}>
                {member.current_employer_url ? (
                  <a
                    href={member.current_employer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3b82f6", textDecoration: "none" }}
                  >
                    {member.Individual_text}
                  </a>
                ) : (
                  <span>{member.Individual_text}</span>
                )}
                : {member.job_titles_id.map((jt) => jt.job_title).join(", ")}
              </div>
            ))}
          </div>
        ) : (
          <div>Not available</div>
        )}
      </div>
    </div>
  );
};

export default React.memo(InvestmentTeam);
