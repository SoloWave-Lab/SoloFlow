/**
 * Preview Generation API Routes
 * Handles preview generation for effects and AI features
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { PreviewService } from "~/lib/preview-service";
import { auth } from "~/lib/auth.server";
import * as fs from 'fs';

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
    // Serve preview file
    if (action.match(/\.(png|jpg|jpeg|webp)$/)) {
      const filePath = `/tmp/${action}`; // Adjust based on your temp directory
      
      if (!fs.existsSync(filePath)) {
        return Response.json({ error: "Preview not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const ext = action.split('.').pop();
      const mimeType = ext === 'png' ? 'image/png' : 
                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                       'image/webp';

      return new Response(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    switch (action) {
      case 'project': {
        const projectId = url.searchParams.get('projectId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!projectId) {
          return Response.json({ error: "Project ID required" }, { status: 400 });
        }

        const previewPath = await PreviewService.generatePreview(projectId, timestamp);
        const previewUrl = PreviewService.getPreviewURL(previewPath);

        return Response.json({ previewUrl, filePath: previewPath });
      }

      case 'color-correction': {
        const scrubberId = url.searchParams.get('scrubberId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!scrubberId) {
          return Response.json({ error: "Scrubber ID required" }, { status: 400 });
        }

        const preview = await PreviewService.generateColorCorrectionPreview(
          scrubberId,
          timestamp
        );

        return Response.json({
          before: PreviewService.getPreviewURL(preview.before),
          after: PreviewService.getPreviewURL(preview.after),
          sideBySide: preview.sideBySide ? PreviewService.getPreviewURL(preview.sideBySide) : null
        });
      }

      case 'background-removal': {
        const scrubberId = url.searchParams.get('scrubberId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!scrubberId) {
          return Response.json({ error: "Scrubber ID required" }, { status: 400 });
        }

        const preview = await PreviewService.generateBackgroundRemovalPreview(
          scrubberId,
          timestamp
        );

        return Response.json({
          before: PreviewService.getPreviewURL(preview.before),
          after: PreviewService.getPreviewURL(preview.after),
          sideBySide: preview.sideBySide ? PreviewService.getPreviewURL(preview.sideBySide) : null
        });
      }

      case 'mask': {
        const maskId = url.searchParams.get('maskId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!maskId) {
          return Response.json({ error: "Mask ID required" }, { status: 400 });
        }

        const preview = await PreviewService.generateMaskPreview(maskId, timestamp);

        return Response.json({
          before: PreviewService.getPreviewURL(preview.before),
          after: PreviewService.getPreviewURL(preview.after),
          sideBySide: preview.sideBySide ? PreviewService.getPreviewURL(preview.sideBySide) : null
        });
      }

      case 'adjustment-layer': {
        const layerId = url.searchParams.get('layerId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!layerId) {
          return Response.json({ error: "Layer ID required" }, { status: 400 });
        }

        const preview = await PreviewService.generateAdjustmentLayerPreview(
          layerId,
          timestamp
        );

        return Response.json({
          before: PreviewService.getPreviewURL(preview.before),
          after: PreviewService.getPreviewURL(preview.after),
          sideBySide: preview.sideBySide ? PreviewService.getPreviewURL(preview.sideBySide) : null
        });
      }

      case 'smart-crop': {
        const scrubberId = url.searchParams.get('scrubberId');
        const timestamp = parseFloat(url.searchParams.get('timestamp') || '0');

        if (!scrubberId) {
          return Response.json({ error: "Scrubber ID required" }, { status: 400 });
        }

        const preview = await PreviewService.generateSmartCropPreview(
          scrubberId,
          timestamp
        );

        return Response.json({
          before: PreviewService.getPreviewURL(preview.before),
          after: PreviewService.getPreviewURL(preview.after),
          sideBySide: preview.sideBySide ? PreviewService.getPreviewURL(preview.sideBySide) : null
        });
      }

      case 'thumbnail-grid': {
        const projectId = url.searchParams.get('projectId');
        const count = parseInt(url.searchParams.get('count') || '10');

        if (!projectId) {
          return Response.json({ error: "Project ID required" }, { status: 400 });
        }

        const thumbnails = await PreviewService.generateThumbnailGrid(projectId, count);
        const thumbnailUrls = thumbnails.map(path => PreviewService.getPreviewURL(path));

        return Response.json({ thumbnails: thumbnailUrls });
      }

      case 'waveform': {
        const audioFilePath = url.searchParams.get('audioFilePath');
        const width = parseInt(url.searchParams.get('width') || '1920');
        const height = parseInt(url.searchParams.get('height') || '200');

        if (!audioFilePath) {
          return Response.json({ error: "Audio file path required" }, { status: 400 });
        }

        const waveformPath = await PreviewService.generateWaveformPreview(
          audioFilePath,
          width,
          height
        );

        return Response.json({
          waveformUrl: PreviewService.getPreviewURL(waveformPath)
        });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Preview API error:', error);
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
      case 'cleanup': {
        const body = await request.json();
        const { filePaths } = body;

        if (!filePaths || !Array.isArray(filePaths)) {
          return Response.json(
            { error: "File paths array required" },
            { status: 400 }
          );
        }

        await PreviewService.cleanup(filePaths);
        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Preview API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}