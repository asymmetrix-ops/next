"use client";

export default function TestEnvPage() {
  const apiUrl = process.env.NEXT_PUBLIC_XANO_API_URL;

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Environment Variable Test</h1>
      <div className="space-y-4">
        <div>
          <strong>NEXT_PUBLIC_XANO_API_URL:</strong> {apiUrl || "undefined"}
        </div>
        <div>
          <strong>All env vars:</strong>
          <pre className="p-4 mt-2 bg-gray-100 rounded">
            {JSON.stringify(process.env, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
