"use client";

import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@relume_io/relume-ui";
import React from "react";
import { RxChevronRight } from "react-icons/rx";

export function Blog16() {
  return (
    <section id="relume" className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">
        <div className="mb-12 md:mb-18 lg:mb-20">
          <div className="mx-auto w-full max-w-lg text-center text-text-alternative">
            <p className="mb-3 font-semibold md:mb-4">Substack</p>
            <h1 className="mb-5 text-6xl font-bold md:mb-6 md:text-9xl lg:text-10xl">
              What&apos;s worth reading
            </h1>
            <p className="landing-text-secondary md:text-md">Our substack is updated weekly</p>
          </div>
        </div>
        <Tabs defaultValue="view-all" className="flex flex-col justify-center">
          <TabsList className="no-scrollbar mb-12 ml-[-5vw] flex w-screen items-center justify-start overflow-scroll pl-[5vw] md:mb-16 md:ml-0 md:w-full md:justify-center md:overflow-hidden md:pl-0">
            <TabsTrigger
              value="view-all"
              className="landing-tab-trigger border px-4"
            >
              View all
            </TabsTrigger>
            <TabsTrigger
              value="category-one"
              className="landing-tab-trigger border px-4"
            >
              Latest
            </TabsTrigger>
            <TabsTrigger
              value="category-two"
              className="landing-tab-trigger border px-4"
            >
              Top
            </TabsTrigger>
            <TabsTrigger
              value="category-three"
              className="landing-tab-trigger border px-4"
            >
              Discussion
            </TabsTrigger>
            <TabsTrigger
              value="category-four"
              className="landing-tab-trigger border px-4"
            >
              Category four
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="view-all"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="category-one"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="category-two"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="category-three"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="category-four"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="landing-panel grid gap-x-8 gap-y-6 rounded-2xl p-5 md:grid-cols-[.75fr_1fr] md:gap-y-4 md:p-6">
                <a href="#" className="w-full">
                  <div
                    className="aspect-square w-full rounded-xl border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(99,127,252,0.25), rgba(95,208,255,0.15))",
                    }}
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold text-text-alternative">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold text-text-alternative md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p className="landing-text-secondary">
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2 text-text-alternative hover:text-background-alternative"
                  >
                    Read
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
