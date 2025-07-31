import Link from "next/link";

export default function AboutSection() {
  return (
    <div className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-3xl font-bold text-gray-900 md:text-4xl">
              About Asymmetrix
            </h2>
            <p className="mb-6 text-lg text-gray-600">
              We are a leading financial advisory firm specializing in data
              analytics, investment management, and corporate consulting. Our
              mission is to provide our clients with the insights and strategies
              they need to achieve their financial goals.
            </p>
            <p className="mb-8 text-lg text-gray-600">
              With years of experience in the financial industry, our team of
              experts combines deep market knowledge with cutting-edge analytics
              to deliver exceptional results for our clients.
            </p>
            <Link href="/about-us" className="btn-primary">
              Learn More About Us
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600">
                500+
              </div>
              <div className="text-gray-600">Happy Clients</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600">
                $2B+
              </div>
              <div className="text-gray-600">Assets Under Management</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600">
                15+
              </div>
              <div className="text-gray-600">Years of Experience</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600">
                50+
              </div>
              <div className="text-gray-600">Expert Advisors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
