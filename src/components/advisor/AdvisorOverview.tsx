import { AdvisorResponse } from "../../types/advisor";
import { formatSectorsList } from "../../utils/advisorHelpers";
import Image from "next/image";

interface AdvisorOverviewProps {
  advisorData: AdvisorResponse;
}

export const AdvisorOverview: React.FC<AdvisorOverviewProps> = ({
  advisorData,
}) => {
  const {
    Advisor,
    Advised_DA_sectors,
    Portfolio_companies_count,
    Advisors_individuals,
  } = advisorData;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Left Column */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Overview:</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-medium text-gray-700">
              Advised D&A sectors:
            </h3>
            <p className="text-sm leading-relaxed">
              {formatSectorsList(Advised_DA_sectors)}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Year founded:</h3>
            <p className="text-sm">{Advisor.year_founded || "Not available"}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">HQ:</h3>
            <p className="text-sm">
              {Advisor._locations.City},{" "}
              {Advisor._locations.State__Province__County},{" "}
              {Advisor._locations.Country}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Website:</h3>
            <a
              href={Advisor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {Advisor.url}
            </a>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Description:</h3>
            <p className="text-sm leading-relaxed">{Advisor.description}</p>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-700">
              Data & Analytics transactions advised:
            </h3>
            <p className="text-sm">{Portfolio_companies_count}</p>
          </div>

          <div>
            <h3 className="mb-2 font-medium text-gray-700">Advisors:</h3>
            <div className="space-y-1">
              {Advisors_individuals.map((individual, index) => (
                <span
                  key={individual.id}
                  className="text-sm text-blue-600 cursor-pointer hover:underline"
                >
                  {individual.advisor_individuals}
                  {index < Advisors_individuals.length - 1 && ", "}
                </span>
              ))}
            </div>
          </div>

          {/* LinkedIn Logo */}
          <div className="mt-4">
            <a
              href={Advisor.linkedin_data.LinkedIn_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Image
                src="/linkedin-icon.png"
                alt="LinkedIn"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
