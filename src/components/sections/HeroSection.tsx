import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="py-20 container-custom">
        <div className="text-center">
          <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
            Financial Advisory &{" "}
            <span className="text-primary-600">Investment Services</span>
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
            Professional financial advisory services, investment management, and
            market analysis for individuals and businesses seeking strategic
            financial solutions.
          </p>
          <div className="flex flex-col gap-4 justify-center sm:flex-row">
            <Link href="/login" className="px-8 py-3 text-lg btn-primary">
              Get Started
            </Link>
            <Link href="/about-us" className="px-8 py-3 text-lg btn-secondary">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
