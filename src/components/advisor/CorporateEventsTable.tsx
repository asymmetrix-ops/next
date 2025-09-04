import { CorporateEvent } from "../../types/advisor";
import {
  formatDate,
  formatCurrency,
  getCounterpartyRole,
  getOtherAdvisorsText,
} from "../../utils/advisorHelpers";

interface CorporateEventsTableProps {
  events: CorporateEvent[];
}

export const CorporateEventsTable: React.FC<CorporateEventsTableProps> = ({
  events,
}) => {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border border-gray-300 border-collapse"
        style={{ minWidth: "1200px" }}
      >
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left border border-gray-300">
              Description
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Date Announced
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">Type</th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Counterparty Advised
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Related Counterparty
            </th>
            <th className="px-4 py-2 w-64 text-left border border-gray-300">
              Other Counterparties
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Enterprise Value
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Individuals
            </th>
            <th className="px-4 py-2 text-left border border-gray-300">
              Other Advisors
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border border-gray-300">
                <a href="#" className="text-blue-600 hover:underline">
                  {event.description}
                </a>
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {formatDate(event.announcement_date)}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.deal_type || "Not available"}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {getCounterpartyRole(event)}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.related_to_individual_by_event_id &&
                event.related_to_individual_by_event_id._counterparties &&
                event.related_to_individual_by_event_id._counterparties
                  ._new_company?.name ? (
                  <a href="#" className="text-blue-600 hover:underline">
                    {
                      event.related_to_individual_by_event_id._counterparties
                        ._new_company.name
                    }
                  </a>
                ) : (
                  "Not available"
                )}
              </td>
              <td className="px-4 py-2 w-64 border border-gray-300">
                {event._other_counterparties_of_corporate_events.length > 0 ? (
                  <div className="space-y-1 text-sm">
                    {event._other_counterparties_of_corporate_events.map(
                      (counterparty) => (
                        <div
                          key={counterparty.id}
                          className="whitespace-nowrap"
                        >
                          <a
                            href="#"
                            className="text-blue-600 whitespace-nowrap hover:underline"
                          >
                            {counterparty.name}
                          </a>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  "Not available"
                )}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {event.ev_data.enterprise_value_m &&
                event.ev_data._currency &&
                event.ev_data._currency.Currency
                  ? formatCurrency(
                      event.ev_data.enterprise_value_m,
                      event.ev_data._currency.Currency
                    )
                  : "Not available"}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {(event.__related_to_corporate_event_advisors_individuals &&
                  event.__related_to_corporate_event_advisors_individuals
                    .length > 0) ||
                (event._related_to_corporate_event_individuals &&
                  event._related_to_corporate_event_individuals.length > 0) ? (
                  <div className="text-sm">
                    {(event.__related_to_corporate_event_advisors_individuals ||
                      event._related_to_corporate_event_individuals)!.map(
                      (individual, index, arr) => {
                        const wordCount =
                          individual._individuals.advisor_individuals.split(
                            " "
                          ).length;
                        const shouldBreakLine = wordCount > 2;

                        return (
                          <span key={individual.id}>
                            <a
                              href="#"
                              className="text-blue-600 hover:underline"
                            >
                              {individual._individuals.advisor_individuals}
                            </a>
                            {index < arr.length - 1 &&
                              (shouldBreakLine ? <br /> : ", ")}
                          </span>
                        );
                      }
                    )}
                  </div>
                ) : (
                  "Not available"
                )}
              </td>
              <td className="px-4 py-2 border border-gray-300">
                {getOtherAdvisorsText(event._other_advisors_of_corporate_event)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
