"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function TestSectorsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div>Loading auth...</div>;
  }

  if (!isAuthenticated) {
    return <div>Not authenticated - should redirect to login</div>;
  }

  return (
    <div>
      <h1>Test Sectors Page</h1>
      <p>If you can see this, routing and authentication are working!</p>
      <p>
        Authentication status:{" "}
        {isAuthenticated ? "Authenticated" : "Not authenticated"}
      </p>
    </div>
  );
}
