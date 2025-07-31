import Link from "next/link";
import Image from "next/image";

const Header = () => {
  return (
    <header
      className="w-full text-white"
      style={{ background: "var(--gradient-header)" }}
    >
      <div className="container flex justify-between items-center px-6 py-4 mx-auto">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Image
              src="https://www.asymmetrixintelligence.com/images/logo.svg?_wwcv=682"
              alt="Asymmetrix"
              width={120}
              height={32}
              priority
              className="w-auto h-8"
            />
          </div>

          <nav className="hidden items-center space-x-6 md:flex">
            <a
              href="#"
              className="transition-colors text-white/80 hover:text-white"
            >
              Substack
            </a>
            <a
              href="#"
              className="transition-colors text-white/80 hover:text-white"
            >
              About Us
            </a>
          </nav>
        </div>

        <Link
          href="/login"
          className="px-4 py-2 text-white rounded border border-white transition-colors hover:bg-white hover:text-asymmetrix-blue"
        >
          Log in
        </Link>
      </div>
    </header>
  );
};

export default Header;
