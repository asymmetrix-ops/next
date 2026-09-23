"use client";

import { useState } from "react";
import { npsService } from "@/lib/npsService";

interface NpsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCORES = Array.from({ length: 11 }, (_, i) => i); // 0..10

export default function NpsModal({ isOpen, onClose }: NpsModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  if (!isOpen) return null;

  const closeAndReset = () => {
    onClose();
    // Reset local state slightly after close so the closing animation (if any) isn't affected.
    setScore(null);
    setComment("");
    setShowThanks(false);
  };

  const handleDismiss = async () => {
    try {
      await npsService.respond({ action: "dismiss" });
    } catch (error) {
      console.error("NPS dismiss failed:", error);
    } finally {
      closeAndReset();
    }
  };

  const handleOptOut = async () => {
    try {
      await npsService.respond({ action: "opt_out" });
    } catch (error) {
      console.error("NPS opt-out failed:", error);
    } finally {
      closeAndReset();
    }
  };

  const handleSubmit = async () => {
    if (score === null || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await npsService.respond({
        action: "submit",
        score,
        comment: comment.trim() || undefined,
      });
      setShowThanks(true);
      setTimeout(() => {
        closeAndReset();
      }, 1500);
    } catch (error) {
      console.error("NPS submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-modal-title"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-[560px] rounded-xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>

        {showThanks ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Thank you for your feedback!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              We really appreciate you taking the time.
            </p>
          </div>
        ) : (
          <>
            <h2
              id="nps-modal-title"
              className="mb-6 pr-8 text-lg font-bold text-gray-900 sm:text-xl"
            >
              How likely are you to recommend Asymmetrix to a colleague?
            </h2>

            <div className="mb-2 grid grid-cols-11 gap-1 sm:gap-1.5">
              {SCORES.map((value) => {
                const isSelected = score === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScore(value)}
                    aria-pressed={isSelected}
                    className={`mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full border text-xs font-semibold transition-colors sm:max-w-11 sm:text-sm ${
                      isSelected
                        ? "border-[#0075df] bg-[#0075df] text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#0075df] hover:text-[#0075df]"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>

            <div className="mb-6 flex justify-between text-xs text-gray-500">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's the main reason for your score? (optional)"
              rows={3}
              className="mb-6 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#0075df] focus:outline-none focus:ring-1 focus:ring-[#0075df]"
            />

            <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleOptOut}
                className="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
              >
                Don&apos;t ask me again
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={score === null || isSubmitting}
                className={`w-full rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors sm:w-auto ${
                  score === null || isSubmitting
                    ? "cursor-not-allowed bg-gray-300"
                    : "bg-[#0075df] hover:bg-[#005bb5]"
                }`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
