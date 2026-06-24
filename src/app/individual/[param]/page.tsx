"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FollowButton } from "@/components/FollowButton";
import { PlusIcon, BellIcon } from "@heroicons/react/24/outline";
import { useIndividualProfile } from "../../../hooks/useIndividualProfile";
import { formatIndividualLocation } from "../../../utils/individualHelpers";
import { individualService } from "../../../lib/individualService";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import { LinkPanel, T } from "@/components/redesign/primitives";
import { IndividualOverviewCard } from "@/components/individuals/IndividualOverviewCard";
import { IndividualRolesProfilePanel } from "@/components/individuals/IndividualRolesProfilePanel";
import { IndividualCorporateEventsProfilePanel } from "@/components/individuals/IndividualCorporateEventsProfilePanel";
import { IndividualRelatedProfilePanel } from "@/components/individuals/IndividualRelatedProfilePanel";

function PersonAvatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        backgroundColor: T.inset,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
        color: T.muted,
        border: `1px solid ${T.divider}`,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function IndividualProfilePage() {
  const params = useParams();
  const individualId = parseInt(params.param as string);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [otherIndividualNames, setOtherIndividualNames] = useState<
    Record<number, string>
  >({});

  const { profileData, eventsData, individualName, loading, error } =
    useIndividualProfile({
      individualId,
    });

  const displayName =
    individualName || profileData?.Individual?.advisor_individuals || "";

  useEffect(() => {
    if (displayName && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${displayName}`;
    }
  }, [displayName]);

  useEffect(() => {
    const events = eventsData?.events || [];
    const ids = new Set<number>();
    events.forEach((evt) => {
      (evt._related_to_corporate_event_individuals || []).forEach((ind) => {
        if (ind?.id && ind.id !== individualId) ids.add(ind.id);
      });
    });
    const missing = Array.from(ids).filter(
      (id) => otherIndividualNames[id] == null
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        missing.map(async (id) => {
          try {
            const name = await individualService.getIndividualName(id);
            return [id, String(name)] as const;
          } catch {
            return [id, `Individual ${id}`] as const;
          }
        })
      );
      if (!cancelled) {
        setOtherIndividualNames((prev) => {
          const next = { ...prev };
          pairs.forEach(([id, name]) => {
            next[id] = name;
          });
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventsData?.events, individualId, otherIndividualNames]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: T.muted,
          }}
        >
          Loading individual profile…
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            padding: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center", color: T.down }}>{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: T.paper,
          fontFamily: T.sans,
        }}
      >
        <Header />
        <div
          style={{
            flex: 1,
            padding: 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: T.muted,
          }}
        >
          Individual not found
        </div>
        <Footer />
      </div>
    );
  }

  const { Individual, Roles } = profileData;
  const location = formatIndividualLocation(Individual._locations);
  const events = eventsData?.events || [];
  const relatedIndividuals = eventsData?.all_related_individuals || [];

  const rolesGridRow = 2;
  const eventsGridRow = 2;
  const relatedGridRow = 3;

  const styles = {
    container: {
      backgroundColor: T.paper,
      fontFamily: T.sans,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      maxWidth: "100%",
      padding: "18px",
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
    responsiveGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "12px",
      flex: 1,
      maxWidth: "100%",
      overflow: "hidden",
      alignItems: "stretch",
    },
  };

  const responsiveCss = `
    .individual-detail-page { overflow-x: hidden; }
    .responsiveGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      max-width: 100%;
      align-items: stretch;
    }
    .responsiveGrid > * { min-width: 0; min-height: 0; }
    .individual-grid-overview { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .individual-grid-bio { grid-column: 2 / span 2; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .individual-grid-roles { grid-column: 1; grid-row: ${rolesGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .individual-grid-events { grid-column: 2 / span 2; grid-row: ${eventsGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .individual-grid-related { grid-column: 1 / -1; grid-row: ${relatedGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .individual-grid-roles > *,
    .individual-grid-events > *,
    .individual-grid-related > * {
      min-width: 0;
      max-width: 100%;
      width: 100%;
    }
    @media (max-width: 768px) {
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .individual-grid-overview,
      .individual-grid-bio,
      .individual-grid-roles,
      .individual-grid-events,
      .individual-grid-related {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
      }
    }
  `;

  const reportMailTo = `mailto:a.boden@asymmetrixintelligence.com?subject=${encodeURIComponent(
    `Contribute Individual Data – ${displayName} (ID ${individualId})`
  )}&body=${encodeURIComponent(
    "Please describe the data you would like to contribute for this individual page."
  )}`;

  return (
    <div className="individual-detail-page" style={styles.container}>
      <Header />

      <div
        style={{
          backgroundColor: T.paper,
          borderBottom: `1px solid ${T.divider}`,
          padding: "0 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "22px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              minWidth: 0,
              flex: 1,
            }}
          >
            <PersonAvatar name={displayName || "?"} />
            <span
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: T.ink,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
                fontFamily: T.sans,
              }}
            >
              {displayName}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {individualId && !Number.isNaN(individualId) && (
              <FollowButton
                followKey="followed_individuals"
                entityId={individualId}
                entityType="individual"
                label="Individual"
                icon={<BellIcon width={15} height={15} strokeWidth={2} aria-hidden />}
              />
            )}
            <a
              href={reportMailTo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: T.emerald,
                borderRadius: 6,
                padding: "8px 14px",
                textDecoration: "none",
              }}
            >
              <PlusIcon width={15} height={15} strokeWidth={2} aria-hidden />
              Contribute Data
            </a>
          </div>
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="individual-detail-content" style={styles.maxWidth}>
          <div style={styles.responsiveGrid} className="responsiveGrid">
            <div className="individual-grid-overview">
              <IndividualOverviewCard
                fillGridCell
                location={location}
                linkedinUrl={Individual.linkedin_URL}
              />
            </div>

            <div
              className="individual-grid-bio"
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignSelf: isDescriptionExpanded ? "start" : "stretch",
                overflow: isDescriptionExpanded ? "visible" : "hidden",
              }}
            >
              <DescriptionCard
                text={Individual.bio ?? ""}
                expanded={isDescriptionExpanded}
                onToggleExpand={() => setIsDescriptionExpanded((e) => !e)}
                contentRef={descriptionRef}
                fillGridCell={!isDescriptionExpanded}
              />
            </div>

            <div className="individual-grid-roles">
              <LinkPanel fillGridCell className="individual-roles-v3-card">
                <IndividualRolesProfilePanel roles={Roles || []} maxInitial={8} />
              </LinkPanel>
            </div>

            <div className="individual-grid-events">
              <LinkPanel fillGridCell className="individual-events-v3-card">
                <IndividualCorporateEventsProfilePanel
                  events={events}
                  individualId={individualId}
                  otherIndividualNames={otherIndividualNames}
                  maxInitial={5}
                />
              </LinkPanel>
            </div>

            <div className="individual-grid-related">
              <LinkPanel fillGridCell className="individual-related-v3-card">
                <IndividualRelatedProfilePanel
                  individuals={relatedIndividuals}
                  maxInitial={8}
                />
              </LinkPanel>
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>

      <Footer />
    </div>
  );
}
