import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const purchases = await marketplaceRepository.getPurchasesForBuyer(user.userId);

  // Enrich with listing details
  const enriched = await Promise.all(
    purchases.map(async (purchase) => {
      const listing = await marketplaceRepository.getListingById(purchase.listing_id);
      const licensePlan = (await marketplaceRepository.listLicensePlans(purchase.listing_id)).find(
        (lp) => lp.id === purchase.license_plan_id
      );
      return {
        ...purchase,
        listing,
        licensePlan,
      };
    })
  );

  return json({ purchases: enriched });
}