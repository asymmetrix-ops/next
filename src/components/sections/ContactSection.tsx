import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export default function ContactSection() {
  return (
    <div className="py-20 bg-white">
      <div className="container-custom">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
            Get in Touch
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Ready to start your financial journey? Contact us today to learn how
            we can help you achieve your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary-100 text-primary-600">
                <EnvelopeIcon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Email</h3>
            <p className="text-gray-600">info@asymmetrix.com</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary-100 text-primary-600">
                <PhoneIcon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Phone</h3>
            <p className="text-gray-600">+1 (555) 123-4567</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary-100 text-primary-600">
                <MapPinIcon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Location
            </h3>
            <p className="text-gray-600">New York, NY</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-gray-600">
            Schedule a consultation with one of our expert advisors
          </p>
          <button className="btn-primary">Schedule Consultation</button>
        </div>
      </div>
    </div>
  );
}
