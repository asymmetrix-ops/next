const ReportsSection = () => {
  const reports = [
    {
      type: "Newsletter",
      title: "The Rise of Geopolitical Data & Analytics",
      date: "July 15, 2025",
      excerpt:
        "Gillian Tett recently wrote that we are entering a \"new age of geoeconomics\", where economic tools like trade policy and sanctions have become key instruments of state power. This shift isn't just reshaping global politics, it's fundamentally changing how companies identify and manage risk. Geopolitical intelligence, once confined to expert-written reports, is now evolving into structured data that integrates directly with business systems and informs decisions in real-time.",
    },
    {
      type: "Newsletter",
      title: "Asymmetrix Analysis - BlueMatrix acquires RANOS",
      date: "June 20, 2025",
      excerpt:
        "BlueMatrix, a US-based investment research data platform, announced its acquisition of RANOS, a private Equity Research publishing and distribution platform based in New Zealand.",
    },
    {
      type: "Newsletter",
      title:
        "What's next in the $18bn Private Markets Data & Analytics sector?",
      date: "May 19, 2025",
      excerpt:
        "More! More focus, more integration, more data. In this week's guest-authored insight, veteran of Private Equity, Venture Capital and Data & Analytics Jared Bochner has provided his thoughts on the future of Private Markets Data & Analytics, a sector with a TAM estimated to be $18bn by 2030. We thank Jared for taking the time to put together a truly insightful piece.",
    },
  ];

  return (
    <section className="py-20 bg-asymmetrix-bg-light">
      <div className="container px-6 mx-auto">
        <h2 className="mb-16 text-4xl font-bold text-center text-gray-900">
          Recent Reports and Analysis
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {reports.map((report, index) => (
            <div
              key={index}
              className="overflow-hidden bg-white rounded-2xl border-0 shadow-lg"
            >
              <div className="px-4 py-2 bg-blue-100 text-asymmetrix-blue">
                <span className="text-sm font-medium">{report.type}</span>
              </div>
              <div className="p-6">
                <h3 className="mb-3 text-xl font-bold leading-tight text-gray-900">
                  {report.title}
                </h3>
                <p className="mb-4 text-sm text-gray-600">{report.date}</p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {report.excerpt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReportsSection;
