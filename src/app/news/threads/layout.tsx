import { notFound } from "next/navigation";

// Threads are hidden for now: every /news/threads/* route returns 404.
// Remove this layout to bring them back.
export default function NewsThreadsLayout(_: { children: React.ReactNode }) {
  notFound();
}
