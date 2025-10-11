/**
 * Background Jobs API Routes
 * Handles job queue operations
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { jobQueue } from "~/lib/job-queue";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1];

  try {
    switch (action) {
      case 'list': {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) {
          return Response.json({ error: "Project ID required" }, { status: 400 });
        }

        const jobs = await jobQueue.getProjectJobs(projectId);
        return Response.json({ jobs });
      }

      case 'status': {
        const jobId = url.searchParams.get('jobId');
        if (!jobId) {
          return Response.json({ error: "Job ID required" }, { status: 400 });
        }

        const job = await jobQueue.getJob(jobId);
        if (!job) {
          return Response.json({ error: "Job not found" }, { status: 404 });
        }

        return Response.json({ job });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Job API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1];

  try {
    switch (action) {
      case 'create': {
        const body = await request.json();
        const { type, projectId, data } = body;

        if (!type || !projectId || !data) {
          return Response.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const jobId = await jobQueue.addJob(
          type,
          projectId,
          session.user.userId,
          data
        );

        return Response.json({ jobId, status: 'queued' });
      }

      case 'cancel': {
        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
          return Response.json({ error: "Job ID required" }, { status: 400 });
        }

        await jobQueue.cancelJob(jobId);
        return Response.json({ success: true });
      }

      // Auto Caption Job
      case 'auto-caption': {
        const body = await request.json();
        const { captionId, audioFilePath, model, language } = body;

        const jobId = await jobQueue.addJob(
          'auto-caption',
          body.projectId,
          session.user.userId,
          { captionId, audioFilePath, model, language }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Background Removal Job
      case 'background-removal': {
        const body = await request.json();
        const { removalId, scrubberId, videoFilePath, model, quality } = body;

        const jobId = await jobQueue.addJob(
          'background-removal',
          body.projectId,
          session.user.userId,
          { removalId, scrubberId, videoFilePath, model, quality }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Scene Detection Job
      case 'scene-detection': {
        const body = await request.json();
        const { detectionId, videoFilePath, sensitivity, minSceneDuration } = body;

        const jobId = await jobQueue.addJob(
          'scene-detection',
          body.projectId,
          session.user.userId,
          { detectionId, videoFilePath, sensitivity, minSceneDuration }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Color Correction Job
      case 'color-correction': {
        const body = await request.json();
        const { scrubberId, videoFilePath, style, intensity } = body;

        const jobId = await jobQueue.addJob(
          'color-correction',
          body.projectId,
          session.user.userId,
          { scrubberId, videoFilePath, style, intensity }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Smart Crop Job
      case 'smart-crop': {
        const body = await request.json();
        const { scrubberId, videoFilePath, aspectRatio, options } = body;

        const jobId = await jobQueue.addJob(
          'smart-crop',
          body.projectId,
          session.user.userId,
          { scrubberId, videoFilePath, aspectRatio, options }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Video Render Job
      case 'render': {
        const body = await request.json();
        const { projectId, outputPath } = body;

        const jobId = await jobQueue.addJob(
          'video-render',
          projectId,
          session.user.userId,
          { projectId, outputPath }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Mask Render Job
      case 'render-mask': {
        const body = await request.json();
        const { maskId, videoFilePath, outputPath } = body;

        const jobId = await jobQueue.addJob(
          'mask-render',
          body.projectId,
          session.user.userId,
          { maskId, videoFilePath, outputPath }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      // Preview Generation Job
      case 'generate-preview': {
        const body = await request.json();
        const { projectId, timestamp } = body;

        const jobId = await jobQueue.addJob(
          'preview-generation',
          projectId,
          session.user.userId,
          { projectId, timestamp }
        );

        return Response.json({ jobId, status: 'queued' });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Job API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}