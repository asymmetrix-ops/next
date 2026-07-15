import React, { useState } from "react";
import { ExpandableText } from "@/components/common/ExpandableText";

interface CompanyDescriptionProps {
  description: string;
}

const CompanyDescription: React.FC<CompanyDescriptionProps> = ({
  description,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description?.trim()) {
    return <span>-</span>;
  }

  return (
    <ExpandableText
      text={description}
      expanded={isExpanded}
      onToggle={() => setIsExpanded((prev) => !prev)}
      expandLabel="Expand description"
      clampLines={3}
      buttonStyle={{ marginLeft: "8px", textDecoration: "none" }}
    />
  );
};

export default React.memo(CompanyDescription);
