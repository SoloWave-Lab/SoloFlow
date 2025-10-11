import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { marketplaceRepository } from "../lib/marketplace/repository";

export async function loader({ request }: LoaderFunctionArgs) {
  const categories = await marketplaceRepository.listCategories();

  // Build hierarchical structure
  const categoryMap = new Map(categories.map((c) => [c.id, { ...c, children: [] as any[] }]));
  const rootCategories: any[] = [];

  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id);
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id)!.children.push(node);
    } else {
      rootCategories.push(node);
    }
  });

  return json({ categories: rootCategories });
}