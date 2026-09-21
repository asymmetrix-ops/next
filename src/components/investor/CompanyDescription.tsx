import React, { useState } from "react";
import { truncateDescription } from "@/utils/investorHelpers";

interface CompanyDescriptionProps {
  description: string;
}

const CompanyDescription: React.FC<CompanyDescriptionProps> = ({
  description,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { text, isLong } = truncateDescription(description);

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <span>{isExpanded ? description : text}</span>
      {isLong && (
        <button
          onClick={toggleDescription}
          style={{
            background: "none",
            border: "none",
            color: "#3b82f6",
            cursor: "pointer",
            fontSize: "12px",
            marginLeft: "8px",
          }}
        >
          {isExpanded ? "Show less" : "Expand description"}
        </button>
      )}
    </div>
  );
};

export default React.memo(CompanyDescription);
