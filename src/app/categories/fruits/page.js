import CategoryPage from "@/components/category-page";
import { getCategoryBySlug } from "@/data/categories";

const category = getCategoryBySlug("fruits");
const FALLBACK_TITLE = "MealKit | Categories";
const categoryTitle = category ? FALLBACK_TITLE + " | " + category.label : FALLBACK_TITLE;

export const metadata = {
  title: categoryTitle,
  description: category?.description ?? "Browse farm-fresh items by category.",
};

export default function CategoryRoute() {
  return <CategoryPage category={category} />;
}
