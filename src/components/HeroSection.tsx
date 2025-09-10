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
          {/* Changed to mailto link to avoid 404 */}
          <a
            href="mailto:asymmetrix@asymmetrixintelligence.com?subject=Request%20a%20Demo"
            className="inline-block px-8 py-3 text-lg text-white rounded transition-colors bg-asymmetrix-blue-light hover:bg-asymmetrix-blue-dark"
          >
            Request Demo
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
