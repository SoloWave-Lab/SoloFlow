import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/notifications
 * Get user's marketplace notifications
 * 
 * Query params:
 * - unreadOnly: boolean - Only return unread notifications
 * - limit: number - Max notifications to return (default: 50)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  try {
    const notifications = await marketplaceRepository.getNotifications({
      userId: user.userId,
      unreadOnly,
      limit,
    });

    const unreadCount = await marketplaceRepository.getUnreadNotificationCount(user.userId);

    return json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

const MarkReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional(),
});

/**
 * PATCH /api/marketplace/notifications
 * Mark notifications as read
 * 
 * Body:
 * - notificationIds: string[] - Specific notification IDs to mark as read
 * - markAllRead: boolean - Mark all notifications as read
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "PATCH") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const user = await requireUser(request);

  try {
    const body = await request.json();
    const { notificationIds, markAllRead } = MarkReadSchema.parse(body);

    if (markAllRead) {
      await marketplaceRepository.markAllNotificationsRead(user.userId);
      return json({ success: true, message: "All notifications marked as read" });
    }

    if (notificationIds && notificationIds.length > 0) {
      await marketplaceRepository.markNotificationsRead({
        userId: user.userId,
        notificationIds,
      });
      return json({ 
        success: true, 
        message: `${notificationIds.length} notification(s) marked as read` 
      });
    }

    return json({ error: "No notifications specified" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Failed to mark notifications as read:", error);
    return json({ error: "Failed to update notifications" }, { status: 500 });
  }
}