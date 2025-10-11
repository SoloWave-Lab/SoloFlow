import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { z } from "zod";

// Check if user is admin (extend this with proper role checking)
async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if ((user as any)?.email !== "youhaveme064@gmail.com") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const tickets = await marketplaceRepository.listPendingModerationTickets();

  // Enrich with listing details
  const enriched = await Promise.all(
    tickets.map(async (ticket) => {
      const listing = await marketplaceRepository.getListingById(ticket.listing_id);
      const checks = await marketplaceRepository.listAutomatedChecks(ticket.listing_id);
      return {
        ...ticket,
        listing,
        automatedChecks: checks,
      };
    })
  );

  return json({ tickets: enriched });
}

const moderationActionSchema = z.object({
  ticketId: z.string().uuid(),
  action: z.enum(["approve", "reject", "escalate"]),
  notes: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  const body = await request.json();
  const parsed = moderationActionSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const ticket = await marketplaceRepository.getModerationTicketByListingId(parsed.data.ticketId);
  if (!ticket) {
    return json({ error: "Ticket not found" }, { status: 404 });
  }

  const listing = await marketplaceRepository.getListingById(ticket.listing_id);
  if (!listing) {
    return json({ error: "Listing not found" }, { status: 404 });
  }

  switch (parsed.data.action) {
    case "approve":
      await marketplaceRepository.updateModerationTicket({
        ticketId: ticket.id,
        status: "approved",
        assignedAdmin: admin.id,
        notes: parsed.data.notes,
      });
      await marketplaceRepository.updateListing({
        listingId: listing.id,
        status: "published",
      });
      break;

    case "reject":
      await marketplaceRepository.updateModerationTicket({
        ticketId: ticket.id,
        status: "rejected",
        assignedAdmin: admin.id,
        notes: parsed.data.notes,
      });
      await marketplaceRepository.updateListing({
        listingId: listing.id,
        status: "rejected",
        metadata: {
          ...listing.metadata,
          rejection_reason: parsed.data.notes,
        },
      });
      break;

    case "escalate":
      await marketplaceRepository.updateModerationTicket({
        ticketId: ticket.id,
        status: "escalated",
        assignedAdmin: admin.id,
        notes: parsed.data.notes,
      });
      break;
  }

  return json({ success: true }, { status: 200 });
}