import { useState, useCallback, useMemo } from "react";
import type {
  CorporateEvent,
  CorporateEventsResponse,
  MappedCorporateEvent,
} from "@/types/investor";

export const useCorporateEventsData = (investorId: string) => {
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCorporateEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_company_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/Get_investors_corporate_events?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Corporate Events API request failed: ${response.statusText}`
        );
      }

      const data: CorporateEventsResponse = await response.json();
      setCorporateEvents(data.New_Events_Wits_Advisors || []);
    } catch (err) {
      console.error("Error fetching corporate events:", err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  const mappedCorporateEvents = useMemo((): MappedCorporateEvent[] => {
    return corporateEvents.map((event, index) => {
      const counterparties = event["0"] || [];

      // Get other counterparties
      const otherCounterparties = counterparties
        .filter((c) => c._new_company?.name)
        .map((c) => c._new_company?.name || "")
        .filter(Boolean)
        .join(", ");

      // Get advisors if present in index "1"
      const advisorEntries = event["1"] || [];
      const advisorNames = advisorEntries
        .map((a) => a._new_company?.name)
        .filter(Boolean)
        .join(", ");

      return {
        id: event.id,
        originalIndex: index,
        description: event.description,
        announcement_date: event.announcement_date,
        type: event.deal_type,
        counterparty_status:
          event.counterparty_status?.counterparty_syayus?.counterparty_status ||
          "—",
        other_counterparties: otherCounterparties || "—",
        enterprise_value: event.ev_data?.enterprise_value_m
          ? `$${Number(event.ev_data.enterprise_value_m).toLocaleString()}`
          : event.ev_data?.ev_band || "—",
        advisors: advisorNames || "—",
      };
    });
  }, [corporateEvents]);

  return {
    corporateEvents,
    mappedCorporateEvents,
    loading,
    fetchCorporateEvents,
  };
};
