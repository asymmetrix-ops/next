"use client";

import React from "react";
import Image from "next/image";
import { BiLogoLinkedinSquare } from "react-icons/bi";
import { Reveal } from "./Reveal";

// Ordered alphabetically by surname.
const TEAM = [
  {
    name: "Piero Azzano",
    title: "Product Manager",
    blurb: "Previously at Gain.AI and Landytech",
    image: "/icons/pierro.jpeg",
    linkedin: "https://www.linkedin.com/in/piero-azzano-18708a138/",
  },
  {
    name: "Jordan Bintcliffe",
    title: "Head of News",
    blurb: "Previously at LSEG and Octus Media",
    image: "/images/jordan_b_image.png",
    linkedin: "https://www.linkedin.com/in/jordan-bintcliffe/",
  },
  {
    name: "Jared Bochner",
    title: "VP Research",
    blurb: "Previously at Endicott Capital and Preqin",
    image: "/images/jared_headhsot.jpeg",
    linkedin: "https://www.linkedin.com/in/jaredbochner/",
  },
  {
    name: "Alex Boden",
    title: "CEO",
    blurb: "Spent 15+ years in corporate finance at Houlihan Lokey and Quayle Munro",
    image: "/images/a_boden.jpg",
    linkedin: "https://www.linkedin.com/in/alexanderboden/",
  },
  {
    name: "Honor Crean",
    title: "Founders' Associate",
    blurb: "Operations Queen",
    image: "/images/honor.jpg",
    imageClassName: "object-[center_30%]",
    linkedin: "https://www.linkedin.com/in/honor-crean-944437189/",
  },
  {
    name: "Dawnn Dinsey",
    title: "Research Analyst",
    blurb: "Previously at Kaleido Intelligence",
    image: "/images/dawn.jpg",
    linkedin: "https://www.linkedin.com/in/dawnn-dinsey/",
  },
  {
    name: "Alex Grishko",
    title: "Research Associate",
    blurb: "Previously at Dukascopy Bank",
    image: "/images/alex_g.jpg",
    linkedin: "https://www.linkedin.com/in/alex-g-283206268/",
  },
  {
    name: "Sam Hicks",
    title: "Research Analyst",
    blurb: "BSc Economics, University of Bath; previously at Megbuyte and Deloitte",
    image: "/images/sam.jpeg",
    imageClassName: "scale-[1.75] object-[center_38%]",
    linkedin: "https://www.linkedin.com/in/samhicks/",
  },
  {
    name: "Ivan Tucha",
    title: "Full Stack Developer",
    blurb: "5+ years of experience; architecting full-stack platforms",
    image: "/images/ivan.jpeg",
    linkedin: "https://www.linkedin.com/in/ivan-tucha/",
  },
];

const LINKEDIN_JOBS_URL =
  "https://www.linkedin.com/company/asymmetrixintelligence/jobs/";

function initialsOf(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TeamCard({ member }) {
  return (
    <div className="flex h-full flex-col items-center text-center">
      <div className="bg-background-alternative mb-5 flex size-32 items-center justify-center overflow-hidden rounded-full md:size-40">
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            width={160}
            height={160}
            className={`size-32 object-cover md:size-40 ${member.imageClassName ?? ""}`}
          />
        ) : (
          <span className="text-3xl font-semibold">{initialsOf(member.name)}</span>
        )}
      </div>
      <p className="text-xl font-bold text-text-alternative md:text-2xl">{member.name}</p>
      <p className="landing-text-secondary mb-4 text-base md:text-lg">{member.title}</p>
      <p className="landing-text-secondary mb-5 max-w-xs flex-1 text-sm leading-relaxed md:text-base">
        {member.blurb}
      </p>
      <div className="flex h-7 items-center gap-3">
        {member.linkedin ? (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name}'s LinkedIn profile`}
            className="text-[#0A66C2] transition-opacity hover:opacity-75"
          >
            <BiLogoLinkedinSquare className="size-7" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function AboutTeam() {
  return (
    <section className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">
        <Reveal className="mx-auto mb-14 flex max-w-2xl flex-col items-center text-center md:mb-16">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold">
            People
          </p>
          <h2 className="mb-4 text-4xl font-bold text-text-alternative md:text-5xl">
            Asymmetrix Team
          </h2>
          <p className="landing-text-secondary text-base md:text-md">
            Our globally sourced talent is exceptional.
          </p>
        </Reveal>

        <Reveal className="grid grid-cols-1 items-stretch gap-x-10 gap-y-16 sm:grid-cols-2 md:grid-cols-3 md:gap-x-12 md:gap-y-20">
          {TEAM.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-16 max-w-2xl md:mt-20">
          <div
            className="flex flex-col items-center border-t pt-14 text-center md:pt-16"
            style={{ borderTopColor: "var(--asymmetrix-divider)" }}
          >
            <h3 className="mb-3 text-2xl font-bold text-text-alternative md:text-3xl">
              Asymmetrix Hiring Team
            </h3>
            <p className="landing-text-secondary mb-6">
              We&apos;re hiring. Join the team.
            </p>
            <a
              href={LINKEDIN_JOBS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-btn-primary inline-flex h-12 items-center justify-center gap-x-2 rounded-full px-8 text-sm font-semibold text-text-alternative"
            >
              <BiLogoLinkedinSquare className="size-5" />
              View open roles
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
