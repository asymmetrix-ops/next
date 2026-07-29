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
    <section id="relume" className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container">
        <div className="mb-12 md:mb-18 lg:mb-20">
          <div className="mx-auto w-full max-w-lg text-center">
            <p className="mb-3 font-semibold md:mb-4">Substack</p>
            <h1 className="mb-5 text-6xl font-bold md:mb-6 md:text-9xl lg:text-10xl">
              What&apos;s worth reading
            </h1>
            <p className="md:text-md">Our substack is updated weekly</p>
          </div>
        </div>
        <Tabs defaultValue="view-all" className="flex flex-col justify-center">
          <TabsList className="no-scrollbar mb-12 ml-[-5vw] flex w-screen items-center justify-start overflow-scroll pl-[5vw] md:mb-16 md:ml-0 md:w-full md:justify-center md:overflow-hidden md:pl-0">
            <TabsTrigger
              value="view-all"
              className="px-4 data-[state=active]:border data-[state=active]:border-border-primary data-[state=inactive]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-neutral-black"
            >
              View all
            </TabsTrigger>
            <TabsTrigger
              value="category-one"
              className="px-4 data-[state=active]:border data-[state=active]:border-border-primary data-[state=inactive]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-neutral-black"
            >
              Latest
            </TabsTrigger>
            <TabsTrigger
              value="category-two"
              className="px-4 data-[state=active]:border data-[state=active]:border-border-primary data-[state=inactive]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-neutral-black"
            >
              Top
            </TabsTrigger>
            <TabsTrigger
              value="category-three"
              className="px-4 data-[state=active]:border data-[state=active]:border-border-primary data-[state=inactive]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-neutral-black"
            >
              Discussion
            </TabsTrigger>
            <TabsTrigger
              value="category-four"
              className="px-4 data-[state=active]:border data-[state=active]:border-border-primary data-[state=inactive]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-neutral-black"
            >
              Category four
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="view-all"
            className="data-[state=active]:animate-tabs"
          >
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-1 md:gap-y-16 lg:grid-cols-2">
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p>
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p>
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p>
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p>
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
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
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p>
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p>
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p>
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p>
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
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
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p>
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p>
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p>
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p>
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
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
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p>
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p>
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p>
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p>
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
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
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Markets
                    </p>
                    <p className="inline text-sm font-semibold">7 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      The next wave of Data & Analytics M&A: research firms are
                      buying their moats (oh and about that $1,350,000,000
                      invested yesterday)
                    </h3>
                  </a>
                  <p>
                    Owning analysis is no longer enough and a new wave of Data &
                    Analytics M&A is already closing the gap + Kpler and
                    AlphaSense raise big
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Strategy
                    </p>
                    <p className="inline text-sm font-semibold">8 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      What MCPs mean for Data & Analytics Providers
                    </h3>
                  </a>
                  <p>
                    Asymmetrix analyzes the opportunities and challenges of MCP
                    development for data businesses
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">6 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      CME and Silicon Data partner to launch first compute
                      futures
                    </h3>
                  </a>
                  <p>
                    The world’s largest derivatives exchange teams up with the
                    pioneer of daily GPU benchmarks to build a tradable market
                    for computing power
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
                  >
                    Read
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-[.75fr_1fr] md:gap-y-4">
                <a href="#" className="w-full">
                  <img
                    src="https://d22po4pjz3o32e.cloudfront.net/placeholder-image-landscape.svg"
                    alt="Relume placeholder image"
                    className="aspect-square w-full object-cover"
                  />
                </a>
                <div className="flex h-full flex-col items-start justify-center">
                  <div className="rb-4 mb-4 flex w-full items-center justify-start">
                    <p className="mr-4 bg-background-secondary px-2 py-1 text-sm font-semibold">
                      Deals
                    </p>
                    <p className="inline text-sm font-semibold">9 min read</p>
                  </div>
                  <a className="mb-2" href="#">
                    <h3 className="text-xl font-bold md:text-2xl">
                      When data companies acquire their way to scale
                    </h3>
                  </a>
                  <p>
                    How institutional investors are positioning for the next
                    cycle
                  </p>
                  <Button
                    title="Read"
                    variant="link"
                    size="link"
                    iconRight={<RxChevronRight />}
                    className="mt-6 flex items-center justify-center gap-x-2"
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
