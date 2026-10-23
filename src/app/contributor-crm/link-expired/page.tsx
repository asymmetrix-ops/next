export default function LinkExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFC] px-6">
      <div className="w-full max-w-[520px] rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold text-[#0F172A]">
          This link is no longer valid
        </h1>
        <p className="text-sm leading-6 text-[#64748B]">
          The link may have expired or been changed. Please open the link from the most
          recent email we sent you, or reply to that email and we will send a new one.
        </p>
      </div>
    </main>
  );
}
