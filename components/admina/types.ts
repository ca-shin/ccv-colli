import type { Section, Category, Dish, Wine, WineCategory, Allergen } from "@/shared/schema";

export type Tab = string;

export type EditTarget =
  | { type: "section"; sectionId?: string; item?: Section }
  | { type: "category"; sectionId: string; item?: Category }
  | { type: "dish"; categoryId: string; item?: Dish; sectionType?: string | null; sectionNameEn?: string }
  | { type: "wine_category"; item?: WineCategory }
  | { type: "wine"; wineCategoryId: string; item?: Wine }
  | { type: "allergen"; item?: Allergen };
