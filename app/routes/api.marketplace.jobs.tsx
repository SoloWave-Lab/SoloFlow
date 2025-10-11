import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { runScheduledJobs } from "../lib/marketplace/jobs";

/**
 * Endpoint for triggering marketplace background jobs
 * Should be protected with a secret token in production
 */

export async function action({ request }: ActionFunctionArgs) {
  // Verify cron secret token
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.CRON_SECRET_TOKEN;

  if (!expectedToken) {
    return json({ error: "Cron jobs not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const jobName = url.searchParams.get("job") ?? undefined;

  try {
    const results = await runScheduledJobs(jobName);
    return json({ success: true, results }, { status: 200 });
  } catch (error) {
    console.error("Job execution failed:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Job execution failed",
      },
      { status: 500 }
    );
  }
}