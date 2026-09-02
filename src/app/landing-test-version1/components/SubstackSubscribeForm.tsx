"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function SubstackSubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/landing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to subscribe");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to subscribe right now. Please try again."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="landing-panel flex items-center gap-3 rounded-full border px-5 py-3 text-sm">
        <span aria-hidden="true">✓</span>
        <span>You&apos;re subscribed — check your inbox to confirm.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="substack-subscribe-email" className="sr-only">
          Email address
        </label>
        <input
          id="substack-subscribe-email"
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="landing-input h-12 flex-1 rounded-full border px-5 text-sm"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="landing-btn-primary h-12 shrink-0 rounded-full px-6 text-sm font-semibold text-text-alternative disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      {status === "error" && error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : null}
    </form>
  );
}
