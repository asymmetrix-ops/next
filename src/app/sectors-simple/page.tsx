"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function SectorsSimplePage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  console.log("Sectors Simple - authLoading:", authLoading);
  console.log("Sectors Simple - isAuthenticated:", isAuthenticated);
  console.log("Sectors Simple - User:", user);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h1 className="mb-4 text-2xl font-bold">Sectors Simple Page</h1>
      <p>Authentication working: {isAuthenticated ? "Yes" : "No"}</p>
      <p>User: {user?.name || "Unknown"}</p>
      <p>Email: {user?.email || "Unknown"}</p>
    </div>
  );
}
