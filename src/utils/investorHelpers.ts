// Utility functions for investor pages

export const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Not available";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
};

export const truncateDescription = (
  description: string,
  maxLength: number = 150
): { text: string; isLong: boolean } => {
  const isLong = description.length > maxLength;
  const truncated = isLong
    ? description.substring(0, maxLength) + "..."
    : description;
  return { text: truncated, isLong };
};

export const formatLocation = (location: {
  City?: string;
  State__Province__County?: string;
  Country?: string;
}): string => {
  return `${location.City || ""}, ${location.State__Province__County || ""}, ${
    location.Country || ""
  }`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");
};
