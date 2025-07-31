import {
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "Data & Analytics",
    description:
      "Comprehensive data analysis and market insights for informed decision-making.",
    icon: ChartBarIcon,
  },
  {
    name: "Investment Advisory",
    description:
      "Expert investment guidance and portfolio management services.",
    icon: BuildingOfficeIcon,
  },
  {
    name: "Corporate Consulting",
    description:
      "Strategic consulting services for businesses and organizations.",
    icon: UserGroupIcon,
  },
  {
    name: "Market Reports",
    description: "Detailed market analysis and industry trend reports.",
    icon: DocumentTextIcon,
  },
  {
    name: "Global Coverage",
    description:
      "Worldwide market coverage and international investment opportunities.",
    icon: GlobeAltIcon,
  },
  {
    name: "Custom Solutions",
    description: "Tailored financial solutions to meet your specific needs.",
    icon: CogIcon,
  },
];

export default function FeaturesSection() {
  return (
    <div className="py-20 bg-white">
      <div className="container-custom">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Our Core Services
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            We provide comprehensive financial advisory and investment services
            to help you achieve your financial goals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="transition-shadow card hover:shadow-lg"
            >
              <div className="flex items-center mb-4">
                <div className="p-3 rounded-lg bg-primary-100 text-primary-600">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="ml-4 text-xl font-semibold text-gray-900">
                  {feature.name}
                </h3>
              </div>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
