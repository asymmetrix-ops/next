"use client";

import { Button, Input } from "@relume_io/relume-ui";
import React, { useState } from "react";
import { BiLogoLinkedinSquare } from "react-icons/bi";
import { SiSubstack } from "react-icons/si";

const useForm = () => {
  const [email, setEmail] = useState("");
  const handleSetEmail = (event) => {
    setEmail(event.target.value);
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log({ email });
  };
  return {
    email,
    handleSetEmail,
    handleSubmit,
  };
};

export function Footer1() {
  const formState = useForm();
  return (
    <footer
      id="relume"
      className="landing-near-black-bg px-[5%] py-12 text-text-alternative md:py-18 lg:py-20"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-x-[8vw] gap-y-12 pb-12 md:gap-y-16 md:pb-18 lg:grid-cols-[0.75fr_1fr] lg:gap-y-4 lg:pb-20">
          <div className="flex flex-col">
            <a href="#" className="mb-5 md:mb-6">
              <img
                src="/icons/logo.svg"
                alt="Logo image"
                className="inline-block"
              />
            </a>
            <p className="landing-text-secondary mb-5 md:mb-6">
              Get the latest on data and analytics intelligence.
            </p>
            <div className="w-full max-w-md">
              <form
                className="mb-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-[1fr_max-content] md:gap-y-4"
                onSubmit={formState.handleSubmit}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={formState.email}
                  onChange={formState.handleSetEmail}
                  className="landing-input"
                />
                <Button
                  title="Subscribe"
                  variant="secondary"
                  size="sm"
                  className="landing-btn-primary h-12 rounded-full px-6 text-text-alternative"
                >
                  Subscribe
                </Button>
              </form>
              <p className="landing-text-secondary text-xs">
                We respect your inbox and your privacy.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 items-start gap-y-10 sm:grid-cols-3 sm:gap-x-6 md:gap-x-8 md:gap-y-4">
            <div className="flex flex-col items-start justify-start">
              <h2 className="mb-3 font-semibold text-text-alternative md:mb-4">Product</h2>
              <ul>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>What we cover</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>Clients</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-start justify-start">
              <h2 className="mb-3 font-semibold text-text-alternative md:mb-4">About</h2>
              <ul>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>About Us</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>Contact us</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>People</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>Careers</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>Press Releases</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <span>Follow us</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-start justify-start">
              <h2 className="mb-3 font-semibold text-text-alternative md:mb-4">Stay Informed</h2>
              <ul className="flex flex-col items-start">
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <SiSubstack className="size-6" />
                    <span>Substack</span>
                  </a>
                </li>
                <li className="py-2 text-sm">
                  <a
                    href="#"
                    className="landing-text-secondary flex items-center gap-3 hover:text-text-alternative"
                  >
                    <BiLogoLinkedinSquare className="size-6" />
                    <span>LinkedIn</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="landing-divider h-px w-full" />
        <div className="landing-text-secondary flex flex-col-reverse items-start justify-between pb-4 pt-6 text-sm md:flex-row md:items-center md:pb-0 md:pt-8">
          <p className="mt-6 md:mt-0">© 2024 Asymmetrix. All rights reserved.</p>
          <ul className="grid grid-flow-row grid-cols-[max-content] justify-center gap-y-4 text-sm md:grid-flow-col md:gap-x-6 md:gap-y-0">
            <li className="underline hover:text-text-alternative">
              <a href="#">Privacy policy</a>
            </li>
            <li className="underline hover:text-text-alternative">
              <a href="#">Terms of service</a>
            </li>
            <li className="underline hover:text-text-alternative">
              <a href="#">Cookie settings</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
