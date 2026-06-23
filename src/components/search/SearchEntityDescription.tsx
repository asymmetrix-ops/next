"use client";

import React, { useState } from "react";

export const SearchEntityDescription = React.memo(function SearchEntityDescription({
  description,
}: {
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = description.length > 250;

  return (
    <div className="company-description">
      <div
        className={
          isExpanded ? "company-description-full" : "company-description-truncated"
        }
      >
        {isExpanded || !isLong ? description : `${description.substring(0, 250)}...`}
      </div>
      {isLong && (
        <span
          className="expand-description"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </span>
      )}
    </div>
  );
});
