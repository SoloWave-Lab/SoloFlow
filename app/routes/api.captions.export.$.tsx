/**
 * Caption Export API Routes
 * Handles caption export to various formats (SRT, VTT, ASS, etc.)
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { CaptionExportService, type CaptionFormat } from "~/lib/caption-export";
import { AIRepository } from "~/lib/ai.repo";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const captionId = url.searchParams.get('captionId');
  const format = url.searchParams.get('format') as CaptionFormat;

  if (!captionId || !format) {
    return Response.json(
      { error: "Caption ID and format required" },
      { status: 400 }
    );
  }

  try {
    // Get caption data
    const result = await db.query(`
      SELECT captions_data, style_settings
      FROM auto_captions
      WHERE id = $1
    `, [captionId]);

    if (result.rows.length === 0) {
      return Response.json({ error: "Caption not found" }, { status: 404 });
    }

    const captionsData = result.rows[0].captions_data || [];
    const styleSettings = result.rows[0].style_settings || {};

    // Get any manual edits
    const edits = await AIRepository.getCaptionEdits(captionId);
    
    // Merge edits with original captions
    const captions = edits.length > 0 ? edits : captionsData;

    // Export to requested format
    const exportedContent = CaptionExportService.export(
      captions,
      format,
      styleSettings
    );

    // Save export history
    await db.query(`
      INSERT INTO caption_exports (caption_id, format, file_path, file_size)
      VALUES ($1, $2, $3, $4)
    `, [captionId, format, `captions_${captionId}.${format}`, exportedContent.length]);

    // Return file
    const mimeTypes: Record<CaptionFormat, string> = {
      srt: 'application/x-subrip',
      vtt: 'text/vtt',
      ass: 'text/x-ssa',
      sbv: 'text/plain',
      json: 'application/json'
    };

    return new Response(exportedContent, {
      headers: {
        'Content-Type': mimeTypes[format] || 'text/plain',
        'Content-Disposition': `attachment; filename="captions_${captionId}.${format}"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('Caption export error:', error);
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
      case 'import': {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const format = formData.get('format') as CaptionFormat;
        const captionId = formData.get('captionId') as string;

        if (!file || !format || !captionId) {
          return Response.json(
            { error: "File, format, and caption ID required" },
            { status: 400 }
          );
        }

        const content = await file.text();
        const captions = CaptionExportService.import(content, format);

        // Save imported captions
        await db.query(`
          UPDATE auto_captions
          SET captions_data = $1, status = 'completed', processed_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(captions), captionId]);

        return Response.json({
          success: true,
          captionCount: captions.length
        });
      }

      case 'merge': {
        const body = await request.json();
        const { captionId } = body;

        if (!captionId) {
          return Response.json({ error: "Caption ID required" }, { status: 400 });
        }

        // Get captions
        const result = await db.query(`
          SELECT captions_data FROM auto_captions WHERE id = $1
        `, [captionId]);

        if (result.rows.length === 0) {
          return Response.json({ error: "Caption not found" }, { status: 404 });
        }

        const captions = result.rows[0].captions_data || [];
        const merged = CaptionExportService.mergeOverlapping(captions);

        // Update captions
        await db.query(`
          UPDATE auto_captions
          SET captions_data = $1
          WHERE id = $2
        `, [JSON.stringify(merged), captionId]);

        return Response.json({
          success: true,
          originalCount: captions.length,
          mergedCount: merged.length
        });
      }

      case 'split': {
        const body = await request.json();
        const { captionId, maxLength } = body;

        if (!captionId) {
          return Response.json({ error: "Caption ID required" }, { status: 400 });
        }

        // Get captions
        const result = await db.query(`
          SELECT captions_data FROM auto_captions WHERE id = $1
        `, [captionId]);

        if (result.rows.length === 0) {
          return Response.json({ error: "Caption not found" }, { status: 404 });
        }

        const captions = result.rows[0].captions_data || [];
        const split = CaptionExportService.splitLong(captions, maxLength || 80);

        // Update captions
        await db.query(`
          UPDATE auto_captions
          SET captions_data = $1
          WHERE id = $2
        `, [JSON.stringify(split), captionId]);

        return Response.json({
          success: true,
          originalCount: captions.length,
          splitCount: split.length
        });
      }

      case 'adjust-timing': {
        const body = await request.json();
        const { captionId, offset } = body;

        if (!captionId || offset === undefined) {
          return Response.json(
            { error: "Caption ID and offset required" },
            { status: 400 }
          );
        }

        // Get captions
        const result = await db.query(`
          SELECT captions_data FROM auto_captions WHERE id = $1
        `, [captionId]);

        if (result.rows.length === 0) {
          return Response.json({ error: "Caption not found" }, { status: 404 });
        }

        const captions = result.rows[0].captions_data || [];
        const adjusted = CaptionExportService.adjustTiming(captions, offset);

        // Update captions
        await db.query(`
          UPDATE auto_captions
          SET captions_data = $1
          WHERE id = $2
        `, [JSON.stringify(adjusted), captionId]);

        return Response.json({
          success: true,
          captionCount: adjusted.length,
          offset
        });
      }

      case 'batch-export': {
        const body = await request.json();
        const { captionIds, format } = body;

        if (!captionIds || !Array.isArray(captionIds) || !format) {
          return Response.json(
            { error: "Caption IDs array and format required" },
            { status: 400 }
          );
        }

        const exports: Array<{ captionId: string; content: string }> = [];

        for (const captionId of captionIds) {
          const result = await db.query(`
            SELECT captions_data, style_settings
            FROM auto_captions
            WHERE id = $1
          `, [captionId]);

          if (result.rows.length > 0) {
            const captionsData = result.rows[0].captions_data || [];
            const styleSettings = result.rows[0].style_settings || {};

            const content = CaptionExportService.export(
              captionsData,
              format,
              styleSettings
            );

            exports.push({ captionId, content });

            // Save export history
            await db.query(`
              INSERT INTO caption_exports (caption_id, format, file_path, file_size)
              VALUES ($1, $2, $3, $4)
            `, [captionId, format, `captions_${captionId}.${format}`, content.length]);
          }
        }

        return Response.json({
          success: true,
          exports: exports.length,
          data: exports
        });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Caption export API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}