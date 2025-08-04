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
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">
              Description
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Date Announced
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Counterparty Advised
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Other Counterparties
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Enterprise Value
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Individuals
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left">
              Other Advisors
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">
                <a href="#" className="text-blue-600 hover:underline">
                  {event.description}
                </a>
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {formatDate(event.announcement_date)}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {event.deal_type || "Not available"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {getCounterpartyRole(event)}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {event._other_counterparties_of_corporate_events.length > 0 ? (
                  <div className="space-y-1">
                    {event._other_counterparties_of_corporate_events.map(
                      (counterparty) => (
                        <div key={counterparty.id}>
                          <a href="#" className="text-blue-600 hover:underline">
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
              <td className="border border-gray-300 px-4 py-2">
                {event.ev_data.enterprise_value_m && event.ev_data._currency
                  ? formatCurrency(
                      event.ev_data.enterprise_value_m,
                      event.ev_data._currency.Currency
                    )
                  : "Not available"}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {event.__related_to_corporate_event_advisors_individuals
                  .length > 0 ? (
                  <div className="space-y-1">
                    {event.__related_to_corporate_event_advisors_individuals.map(
                      (individual) => (
                        <div key={individual.id}>
                          <a href="#" className="text-blue-600 hover:underline">
                            {individual._individuals.advisor_individuals}
                          </a>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  "Not available"
                )}
              </td>
              <td className="border border-gray-300 px-4 py-2">
                {getOtherAdvisorsText(event._other_advisors_of_corporate_event)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
