"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";
import {
  searchMcpGuestCompanies,
  type McpGuestCompanyOption,
} from "@/lib/mcpGuestCompanySearch";

export default function McpGuestLoginPage() {
  const router = useRouter();
  const { loginMcpGuest, isAuthenticated, isMcpGuest, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<McpGuestCompanyOption | null>(null);
  const [companyResults, setCompanyResults] = useState<McpGuestCompanyOption[]>(
    []
  );
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [companySearching, setCompanySearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const companyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && isMcpGuest) {
      router.replace(MCP_GUEST_ALLOWED_PATH);
    }
  }, [loading, isAuthenticated, isMcpGuest, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyContainerRef.current &&
        !companyContainerRef.current.contains(event.target as Node)
      ) {
        setCompanySearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!companySearchOpen || selectedCompany) {
      setCompanyResults([]);
      setCompanySearching(false);
      return;
    }

    const query = companyQuery.trim();
    if (query.length < 2) {
      setCompanyResults([]);
      setCompanySearching(false);
      return;
    }

    setCompanySearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchMcpGuestCompanies(query);
        setCompanyResults(items);
      } catch {
        setCompanyResults([]);
      } finally {
        setCompanySearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [companyQuery, companySearchOpen, selectedCompany]);

  const handleCompanyInputChange = (value: string) => {
    setCompanyQuery(value);
    setSelectedCompany(null);
    setCompanySearchOpen(true);
  };

  const handleCompanySelect = (company: McpGuestCompanyOption) => {
    setSelectedCompany(company);
    setCompanyQuery(company.name);
    setCompanyResults([]);
    setCompanySearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.error("Please enter your name.");
      return;
    }
    if (!trimmedEmail) {
      toast.error("Please enter your email.");
      return;
    }
    if (!selectedCompany) {
      toast.error("Please select your company from the list.");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginMcpGuest(
        trimmedEmail,
        trimmedName,
        selectedCompany.id,
        selectedCompany.name
      );
      toast.success("Welcome! Loading MCP companies…");
      router.push(MCP_GUEST_ALLOWED_PATH);
    } catch {
      toast.error("Could not sign in. Please check your email and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const companyInputValue = selectedCompany ? selectedCompany.name : companyQuery;

  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
        <Link
          href="/"
          className="flex gap-3 items-center text-gray-900 no-underline"
        >
          <Image
            src="/icons/logo.svg"
            alt="Logo"
            width={40}
            height={40}
            style={{ borderRadius: "50%" }}
          />
          <span className="hidden font-bold tracking-wide sm:inline">
            ASYMMETRIX
          </span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="px-6 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              MCP Guest access
            </h1>
            <p className="text-gray-600">
              Enter your details to browse MCP companies. No password required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
                required
                autoComplete="name"
              />
            </div>

            <div ref={companyContainerRef} className="relative">
              <label
                htmlFor="company"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={companyInputValue}
                onChange={(e) => handleCompanyInputChange(e.target.value)}
                onFocus={() => {
                  if (!selectedCompany) setCompanySearchOpen(true);
                }}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search for your company"
                autoComplete="organization"
                required
              />

              {companySearchOpen && !selectedCompany && (
                <div className="overflow-y-auto absolute z-20 mt-1 w-full max-h-56 bg-white rounded-lg border border-gray-200 shadow-lg">
                  {companyQuery.trim().length < 2 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Type at least 2 characters to search…
                    </div>
                  ) : companySearching ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Searching…
                    </div>
                  ) : companyResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No companies found.
                    </div>
                  ) : (
                    companyResults.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleCompanySelect(company)}
                        className="block px-4 py-3 w-full text-sm text-left text-gray-900 hover:bg-gray-50"
                      >
                        {company.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
