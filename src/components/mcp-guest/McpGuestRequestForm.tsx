"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { submitMcpGuestRequest } from "@/lib/mcpGuestRequest";
import McpGuestCompanyField from "@/components/mcp-guest/McpGuestCompanyField";
import { isWorkEmail, WORK_EMAIL_REQUIRED_MESSAGE } from "@/lib/workEmail";

interface McpGuestRequestFormProps {
  initialWorkEmail?: string;
  lockWorkEmail?: boolean;
  onSubmitted?: () => void;
  submitLabel?: string;
}

export default function McpGuestRequestForm({
  initialWorkEmail = "",
  lockWorkEmail = false,
  onSubmitted,
  submitLabel = "Submit request",
}: McpGuestRequestFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [workEmail, setWorkEmail] = useState(initialWorkEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedCompany = company.trim();
    const trimmedWorkEmail = workEmail.trim();

    if (!trimmedFirstName) {
      toast.error("Please enter your first name.");
      return;
    }
    if (!trimmedLastName) {
      toast.error("Please enter your last name.");
      return;
    }
    if (!trimmedCompany) {
      toast.error("Please enter your company.");
      return;
    }
    if (!trimmedWorkEmail) {
      toast.error("Please enter your work email.");
      return;
    }
    if (!isWorkEmail(trimmedWorkEmail)) {
      toast.error(WORK_EMAIL_REQUIRED_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMcpGuestRequest({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        company: trimmedCompany,
        work_email: trimmedWorkEmail,
        new_company_id: companyId && companyId > 0 ? companyId : 0,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      toast.error("Could not submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Request submitted</h2>
        <p className="text-gray-600 leading-relaxed">
          Thank you for your interest in MCP Guest access. Our team will review
          your request and get back to you within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="mcp-request-firstName"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          First name
        </label>
        <input
          id="mcp-request-firstName"
          name="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your first name"
          required
          autoComplete="given-name"
        />
      </div>

      <div>
        <label
          htmlFor="mcp-request-lastName"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Last name
        </label>
        <input
          id="mcp-request-lastName"
          name="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your last name"
          required
          autoComplete="family-name"
        />
      </div>

      <div>
        <label
          htmlFor="mcp-request-company"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Company
        </label>
        <McpGuestCompanyField
          companyName={company}
          companyId={companyId}
          onChange={(name, id) => {
            setCompany(name);
            setCompanyId(id);
          }}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="mcp-request-workEmail"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Work email
        </label>
        <input
          id="mcp-request-workEmail"
          name="workEmail"
          type="email"
          value={workEmail}
          onChange={(e) => setWorkEmail(e.target.value)}
          readOnly={lockWorkEmail}
          className={`px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            lockWorkEmail ? "bg-gray-50 text-gray-700 cursor-not-allowed" : ""
          }`}
          placeholder="Enter your work email"
          required
          autoComplete="email"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting…" : submitLabel}
      </button>
    </form>
  );
}
