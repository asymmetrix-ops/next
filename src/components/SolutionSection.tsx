const SolutionSection = () => {
  const solutions = [
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      ),
      title: "Identify",
      description: "Data & Analytics companies",
      metric: "5,000+ companies",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3v18h18" />
          <path d="m9 9 3 3 3-3" />
          <path d="m9 15 3-3 3 3" />
        </svg>
      ),
      title: "Track",
      description: "Data & Analytics sector",
      metric: "700+ sub-sectors",
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3v18h18" />
          <path d="M9 9h2v6H9z" />
          <path d="M13 9h2v6h-2z" />
          <path d="M17 9h2v6h-2z" />
        </svg>
      ),
      title: "Predict",
      description: "Data & Analytics sector",
      metric: "Weekly reports & analysis",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container px-6 mx-auto">
        <h2 className="mb-16 text-4xl font-bold text-center text-gray-900">
          The Asymmetrix solution
        </h2>

        <div className="grid gap-8 md:grid-cols-3">
          {solutions.map((solution, index) => (
            <div
              key={index}
              className="overflow-hidden p-8 text-white rounded-2xl border-0 shadow-lg"
              style={{
                background: "var(--gradient-card)",
                boxShadow: "rgba(0, 0, 0, 0.15) 0px 10px 20px",
              }}
            >
              <div className="flex items-center mb-4">
                {solution.icon}
                <h3 className="ml-3 text-2xl font-bold">{solution.title}</h3>
              </div>
              <p className="mb-6 text-lg text-asymmetrix-text-light">
                {solution.description}
              </p>
              <p className="text-lg font-semibold text-white">
                {solution.metric}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
