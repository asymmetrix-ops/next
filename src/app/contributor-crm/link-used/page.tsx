export default function LinkUsedPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-8 text-center">
        <h1 className="text-xl font-bold text-[#0f172a]">Thank you, we have your contribution</h1>
        <p className="mt-3 text-sm text-[#475569]">
          You have already sent your changes, so this link can no longer be used. The Asymmetrix team will
          review what you sent. If you need to add something, reply to the email you received.
        </p>
      </div>
    </div>
  );
}
