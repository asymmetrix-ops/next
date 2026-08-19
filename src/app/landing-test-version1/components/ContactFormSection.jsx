"use client";

import React, { useState } from "react";
import { BiEnvelope, BiPhone, BiMap } from "react-icons/bi";
import { Reveal } from "./Reveal";

const ABOUT_OPTIONS = [
  { value: "pe-firm", label: "PE firm" },
  { value: "ma-advisor", label: "M&A advisor" },
  { value: "corporate", label: "Corporate" },
  { value: "investor", label: "Investor" },
  { value: "journalist", label: "Journalist" },
  { value: "other", label: "Other" },
];

const initialState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  about: "",
  message: "",
  agreed: false,
};

export function ContactFormSection() {
  const [form, setForm] = useState(initialState);
  const [submitted, setSubmitted] = useState(false);

  const update = (field) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.agreed) return;
    console.log(form);
    setSubmitted(true);
  };

  return (
    <section className="landing-near-black-bg px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">
        <Reveal className="grid grid-cols-1 gap-x-12 gap-y-12 text-text-alternative lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold">
              Inquiry
            </p>
            <h2 className="mb-5 text-4xl font-bold leading-[1.1] md:text-5xl">
              Send a message
            </h2>
            <p className="landing-text-secondary mb-10 max-w-md text-base md:text-md">
              Tell us what you need
            </p>

            <ul className="flex flex-col gap-5">
              <li className="flex items-center gap-3">
                <BiEnvelope className="size-5 shrink-0 text-background-alternative" />
                <a href="mailto:hello@asymmetrixintelligence.com" className="hover:underline">
                  hello@asymmetrixintelligence.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <BiPhone className="size-5 shrink-0 text-background-alternative" />
                <span>+44 20 3745 8420</span>
              </li>
              <li className="flex items-center gap-3">
                <BiMap className="size-5 shrink-0 text-background-alternative" />
                <span>London, United Kingdom</span>
              </li>
            </ul>
          </div>

          <div className="landing-panel rounded-2xl p-6 md:p-8">
            {submitted ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <h3 className="mb-2 text-2xl font-bold">Thanks — message sent</h3>
                <p className="landing-text-secondary max-w-sm">
                  A member of the Asymmetrix team will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="firstName" className="text-sm font-medium">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={update("firstName")}
                    className="landing-input h-12 rounded-lg border px-4 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={update("lastName")}
                    className="landing-input h-12 rounded-lg border px-4 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={update("email")}
                    className="landing-input h-12 rounded-lg border px-4 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    className="landing-input h-12 rounded-lg border px-4 text-sm"
                  />
                </div>

                <fieldset className="flex flex-col gap-3 sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium">
                    How would you describe yourself
                  </legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {ABOUT_OPTIONS.map((option) => {
                      const isSelected = form.about === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            isSelected
                              ? "border-transparent bg-background-alternative text-white"
                              : "landing-btn-secondary"
                          }`}
                        >
                          <input
                            type="radio"
                            name="about"
                            value={option.value}
                            checked={isSelected}
                            onChange={update("about")}
                            className="sr-only"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Tell us more"
                    value={form.message}
                    onChange={update("message")}
                    className="landing-input rounded-lg border px-4 py-3 text-sm"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    required
                    checked={form.agreed}
                    onChange={update("agreed")}
                    className="size-4 rounded"
                  />
                  I agree to the terms
                </label>

                <button
                  type="submit"
                  className="landing-btn-primary h-12 w-full rounded-full text-sm font-semibold text-text-alternative sm:col-span-2 sm:w-auto sm:px-10"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
