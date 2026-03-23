"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { decodeJwt, type JWTPayload } from "jose";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import CorporateEventsPage from "@/app/corporate-events/page";
import CorporateEventForm, {
  type CorporateEventFormData,
} from "@/app/admin/data-entry/_components/CorporateEventForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";

const NEW_CE_ENDPOINT =
  "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/new_corporate_event";

function getTokenStatus(token: string | null): string {
  if (!token) return "";

  try {
    const claims: JWTPayload = decodeJwt(token);
    const rawStatus =
      (claims as Record<string, unknown>).status ??
      (claims as Record<string, unknown>).Status ??
      (claims as Record<string, unknown>).role;

    return typeof rawStatus === "string" ? rawStatus : "";
  } catch {
    return "";
  }
}

function CEDataEntryContent() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isAdmin = useMemo(() => {
    const tokenStatus = getTokenStatus(authService.getToken()).toLowerCase();
    const userStatus = String(
      user?.Status ?? user?.status ?? user?.role ?? ""
    ).toLowerCase();
    const roles = (user?.roles ?? []).map((role) => String(role).toLowerCase());

    return (
      tokenStatus === "admin" ||
      userStatus === "admin" ||
      roles.includes("admin")
    );
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isAuthenticated, loading, router]);

  const handleCreateSave = async (payload: CorporateEventFormData) => {
    try {
      const token = authService.getToken();
      if (!token) {
        toast.error("Authentication required.");
        router.replace("/login");
        return;
      }

      const response = await fetch(NEW_CE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const responseData = await response
        .json()
        .catch(() => ({ error: "Invalid server response" }));

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
            responseData?.message ||
            "Failed to create corporate event."
        );
      }

      toast.success("Corporate event created successfully.");
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create corporate event:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create corporate event."
      );
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  if (loading || !isAuthenticated || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>{loading ? "Loading..." : "Access denied."}</div>
      </div>
    );
  }

  return (
    <>
      <CorporateEventsPage />

      <button
        type="button"
        className="fixed top-24 right-6 z-40 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-lg hover:bg-green-700"
        onClick={() => setIsCreateModalOpen(true)}
      >
        Add New Corporate Event
      </button>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Create corporate event"
          onClick={handleCloseModal}
        >
          <div
            className="flex flex-col my-auto w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Corporate Event
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  New corporate event form for the data-entry workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-gray-50">
              <CorporateEventForm
                mode="create"
                onSave={handleCreateSave}
                onDiscard={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CEDataEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <div>Loading...</div>
        </div>
      }
    >
      <CEDataEntryContent />
    </Suspense>
  );
}
