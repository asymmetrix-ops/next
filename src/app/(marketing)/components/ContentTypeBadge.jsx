import { getContentTypeBadgeStyle } from "@/lib/contentTypeBadge";

export function ContentTypeBadge({ contentType, className = "" }) {
  const label = (contentType || "").trim() || "Analysis";

  return (
    <span className={className} style={getContentTypeBadgeStyle(label)}>
      {label}
    </span>
  );
}
