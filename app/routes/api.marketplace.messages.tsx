import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { marketplaceRepository } from "~/lib/marketplace/repository";
import { requireUser } from "~/lib/auth.server";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(1).max(5000),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
});

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
});

// ============================================================================
// LOADER - GET CONVERSATIONS OR MESSAGES
// ============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const userType = url.searchParams.get("userType") as 'buyer' | 'seller' | null;
  const status = url.searchParams.get("status") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  // Get messages for a specific conversation
  if (conversationId) {
    const messages = await marketplaceRepository.getMessages({
      conversationId,
      limit: 50,
      offset: 0,
    });

    // Verify user has access to this conversation
    if (messages.length > 0) {
      const firstMessage = messages[0];
      // Check if user is part of the conversation
      const conversations = await marketplaceRepository.getConversations({
        userId: user.userId,
        userType: userType || 'buyer',
        limit: 1,
        offset: 0,
      });
      
      const hasAccess = conversations.some(c => c.id === conversationId);
      if (!hasAccess) {
        return json({ error: "Access denied" }, { status: 403 });
      }
    }

    return json({
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        senderEmail: m.sender_email,
        message: m.message,
        attachments: m.attachments,
        isRead: m.is_read,
        readAt: m.read_at,
        createdAt: m.created_at,
      })),
    });
  }

  // Get conversations list
  if (!userType) {
    return json({ error: "userType parameter required (buyer or seller)" }, { status: 400 });
  }

  const conversations = await marketplaceRepository.getConversations({
    userId: user.userId,
    userType,
    status,
    limit,
    offset: (page - 1) * limit,
  });

  const unreadCount = await marketplaceRepository.getUnreadMessageCount(user.userId, userType);

  return json({
    conversations: conversations.map(c => ({
      id: c.id,
      buyerId: c.buyer_id,
      buyerEmail: c.buyer_email,
      sellerId: c.seller_id,
      sellerName: c.seller_name,
      listingId: c.listing_id,
      listingTitle: c.listing_title,
      subject: c.subject,
      status: c.status,
      lastMessageAt: c.last_message_at,
      lastMessage: c.last_message,
      unreadCount: parseInt(c.unread_count || '0'),
      createdAt: c.created_at,
    })),
    unreadCount,
    pagination: {
      page,
      limit,
      hasMore: conversations.length === limit,
    },
  });
}

// ============================================================================
// ACTION - SEND MESSAGE OR MARK AS READ
// ============================================================================

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const method = request.method;

  // SEND MESSAGE
  if (method === "POST") {
    try {
      const body = await request.json();
      const data = sendMessageSchema.parse(body);

      let conversationId = data.conversationId;
      let senderType: 'buyer' | 'seller' = 'buyer';

      // If no conversation ID, create or get conversation
      if (!conversationId) {
        if (!data.sellerId) {
          return json({ error: "sellerId required when creating new conversation" }, { status: 400 });
        }

        // Check if user is the seller
        const seller = await marketplaceRepository.getSellerByUserId(user.userId);
        if (seller && seller.id === data.sellerId) {
          return json({ error: "Cannot message yourself" }, { status: 400 });
        }

        // Determine sender type
        if (seller) {
          senderType = 'seller';
        }

        const conversation = await marketplaceRepository.getOrCreateConversation({
          buyerId: senderType === 'buyer' ? user.userId : '', // Will be set properly
          sellerId: data.sellerId,
          listingId: data.listingId,
          subject: data.subject,
        });

        conversationId = conversation.id;
      } else {
        // Verify user has access to conversation
        const conversations = await marketplaceRepository.getConversations({
          userId: user.userId,
          userType: 'buyer',
          limit: 1,
          offset: 0,
        });

        let hasAccess = conversations.some(c => c.id === conversationId);
        
        if (!hasAccess) {
          // Check as seller
          const sellerConversations = await marketplaceRepository.getConversations({
            userId: user.userId,
            userType: 'seller',
            limit: 1,
            offset: 0,
          });
          hasAccess = sellerConversations.some(c => c.id === conversationId);
          if (hasAccess) {
            senderType = 'seller';
          }
        }

        if (!hasAccess) {
          return json({ error: "Conversation not found" }, { status: 404 });
        }
      }

      const message = await marketplaceRepository.sendMessage({
        conversationId,
        senderId: user.userId,
        senderType,
        message: data.message,
        attachments: data.attachments,
      });

      return json({
        success: true,
        message: {
          id: message.id,
          conversationId: message.conversation_id,
          message: message.message,
          createdAt: message.created_at,
        },
      }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid message data", details: error.errors }, { status: 400 });
      }
      console.error("Error sending message:", error);
      return json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  // MARK MESSAGES AS READ
  if (method === "PATCH") {
    try {
      const body = await request.json();
      const data = markReadSchema.parse(body);

      await marketplaceRepository.markMessagesAsRead({
        conversationId: data.conversationId,
        userId: user.userId,
      });

      return json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json({ error: "Invalid data", details: error.errors }, { status: 400 });
      }
      console.error("Error marking messages as read:", error);
      return json({ error: "Failed to mark messages as read" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}