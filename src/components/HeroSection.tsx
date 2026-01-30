const HeroSection = () => {
  return (
    <section
      className="py-24 text-white"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="container px-6 mx-auto">
        <div className="max-w-2xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            Data & Analytics
            <br />
            Demystified
          </h1>
          <p className="mb-8 text-xl leading-relaxed text-asymmetrix-text-light">
            Providing critical intelligence to stakeholders
            <br />
            in the Data & Analytics industry
          </p>
          <div className="flex flex-col gap-4 items-start sm:flex-row sm:items-center">
            {/* Changed to mailto link to avoid 404 */}
            <a
              href="mailto:asymmetrix@asymmetrixintelligence.com?subject=Request%20a%20Demo"
              className="inline-block px-8 py-3 text-lg text-white rounded transition-colors bg-asymmetrix-blue-light hover:bg-asymmetrix-blue-dark"
            >
              Request Demo
            </a>
            <a
              href="https://asymmetrixintelligence.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 text-lg text-white rounded transition-colors border border-white/60 hover:border-white hover:bg-white/10"
            >
              Newsletter
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
