"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useIndividuals } from "../../hooks/useIndividuals";
import { IndividualsResponse, Individual } from "../../types/individuals";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Individuals Stats Component
const IndividualsStats = ({ data }: { data: IndividualsResponse }) => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "32px 24px",
        boxShadow: "0px 1px 3px 0px rgba(227, 228, 230, 1)",
        borderRadius: "16px",
        marginBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#1a202c",
          margin: "0 0 24px 0",
        }}
      >
        Individuals
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px 24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Individuals:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.totalIndividuals?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            CEOs:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.ceos?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Current roles:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.currentRoles?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Chair:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.chairs?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Past roles:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.pastRoles?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Founder:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.founders?.toLocaleString() || "0"}
          </span>
        </div>
      </div>
    </div>
  );
};

// Simple Search Component
const SearchComponent = ({
  searchQuery,
  onSearch,
}: {
  searchQuery: string;
  onSearch: (query: string) => void;
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "24px" }}>
        Search Individuals
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <input
          type="text"
          placeholder="Enter name here"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "300px",
            padding: "15px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "14px",
            color: "#4a5568",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            maxWidth: "300px",
            backgroundColor: "#0075df",
            color: "white",
            fontWeight: "600",
            padding: "15px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>
    </div>
  );
};

// Pagination Component
const Pagination = ({
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) => {
  const totalPages = Math.ceil(totalItems / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "24px",
        padding: "16px 0",
      }}
    >
      {/* Items per page */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>Show:</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(parseInt(e.target.value))}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            outline: "none",
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>per page</span>
      </div>

      {/* Page info */}
      <div style={{ fontSize: "14px", color: "#6b7280" }}>
        Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of{" "}
        {totalItems.toLocaleString()} individuals
      </div>

      {/* Page navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* Previous arrow */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          ←
        </button>

        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: currentPage === 1 ? "#0075df" : "white",
            color: currentPage === 1 ? "white" : "#000",
            cursor: "pointer",
          }}
        >
          1
        </button>

        {/* Second page */}
        <button
          onClick={() => onPageChange(2)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: currentPage === 2 ? "#0075df" : "white",
            color: currentPage === 2 ? "white" : "#000",
            cursor: "pointer",
          }}
        >
          2
        </button>

        {/* Ellipsis */}
        {totalPages > 3 && (
          <span
            style={{ padding: "8px 12px", fontSize: "14px", color: "#6b7280" }}
          >
            ...
          </span>
        )}

        {/* Last page */}
        {totalPages > 2 && (
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: currentPage === totalPages ? "#0075df" : "white",
              color: currentPage === totalPages ? "white" : "#000",
              cursor: "pointer",
            }}
          >
            {totalPages}
          </button>
        )}

        {/* Next arrow */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

// Individuals Table Component
const IndividualsTable = ({
  individuals,
  loading,
}: {
  individuals: Individual[];
  loading: boolean;
}) => {
  const router = useRouter();

  const handleIndividualClick = (individualId: number) => {
    router.push(`/individual/${individualId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        Loading individuals...
      </div>
    );
  }

  if (!individuals || individuals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        No individuals found.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        padding: "32px 24px",
        boxShadow: "0px 1px 3px 0px rgba(227, 228, 230, 1)",
        borderRadius: "16px",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Name
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Current Companies
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Current Roles
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Location
            </th>
          </tr>
        </thead>
        <tbody>
          {individuals.map((individual: Individual) => (
            <tr
              key={individual.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                <span
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                  onClick={() => handleIndividualClick(individual.id)}
                >
                  {individual.advisor_individuals || "N/A"}
                </span>
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual.current_company ? (
                  <span
                    style={{
                      color: "#0075df",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {individual.current_company}
                  </span>
                ) : (
                  <span style={{ color: "#6b7280" }}>Not available</span>
                )}
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual.current_roles
                  ?.map((role) => role.job_title)
                  .join(", ") || "Not available"}
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual._locations_individual
                  ? `${individual._locations_individual.City || ""}, ${
                      individual._locations_individual
                        .State__Province__County || ""
                    }, ${individual._locations_individual.Country || ""}`
                      .replace(/^,\s*/, "")
                      .replace(/,\s*$/, "")
                  : "Not available"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Individuals Page Component
const IndividualsPage = () => {
  const {
    data,
    loading,
    error,
    searchQuery,
    handleSearch,
    currentPage,
    perPage,
    handlePageChange,
    handlePerPageChange,
  } = useIndividuals({
    initialPerPage: 50,
  });

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "32px 24px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#e53e3e",
              backgroundColor: "#fed7d7",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div style={{ padding: "32px 24px" }}>
        {/* Search Section */}
        <SearchComponent searchQuery={searchQuery} onSearch={handleSearch} />

        {/* Stats Section */}
        {data && <IndividualsStats data={data} />}

        {/* Table Section */}
        {data && (
          <>
            <IndividualsTable
              individuals={data.Individuals_list?.items || []}
              loading={loading}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={data.Individuals_list?.itemsReceived || 0}
              perPage={perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default IndividualsPage;
