"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchNewsFollowing, setNewsFollowing } from "@/lib/news";

/** Follow/unfollow News emails from email preferences (same state as the News page button). */
export function NewsFollowSettings() {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNewsFollowing()
      .then((v) => !cancelled && setFollowing(v))
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      setFollowing(await setNewsFollowing(next));
      toast.success(
        next
          ? "You'll get an email whenever we publish news."
          : "You've stopped receiving news emails."
      );
    } catch {
      toast.error("Couldn't update your preference. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
      <div className="flex items-baseline gap-3 px-6 py-4 border-b border-gray-100">
        <h2 className="text-[15px] font-bold text-gray-900">News emails</h2>
        <span className="text-xs text-gray-500">
          {following ? "Following" : "Not following"}
        </span>
      </div>
      <label className="flex items-start gap-3 cursor-pointer px-6 py-4">
        <input
          type="checkbox"
          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          checked={following}
          disabled={busy || !ready}
          onChange={(e) => void toggle(e.target.checked)}
        />
        <div>
          <p className="text-gray-900 font-medium text-sm">Follow news</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Get an email each time Asymmetrix publishes a news article, across all
            companies, sectors and deal stages.
          </p>
        </div>
      </label>
    </div>
  );
}
