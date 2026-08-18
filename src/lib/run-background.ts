import { waitUntil } from '@vercel/functions';

/** Run async work after the HTTP response is sent (Vercel serverless). */
export function runInBackground(task: Promise<unknown>): void {
  waitUntil(task);
}
