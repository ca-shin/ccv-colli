export interface Section {
  id: string;
  name_it: string;
  name_en: string;
  subtitle_it?: string;
  subtitle_en?: string;
  order: number;
  type?: string;
}

export interface Category {
  id: string;
  section_id: string;
  name_it: string;
  name_en: string;
  order: number;
}

export interface Dish {
  id: string;
  category_id: string;
  name_it: string;
  name_en: string;
  subtitle_it?: string;
  subtitle_en?: string;
  description_it: string;
  description_en: string;
  price: number | null;
  vegetarian: boolean;
  gluten_free: boolean;
  allergens: string[];
  extra_info: string;
  order: number;
}

export interface WineCategory {
  id: string;
  name_it: string;
  name_en: string;
  order: number;
}

export interface Wine {
  id: string;
  wine_category_id: string;
  name_it: string;
  name_en: string;
  producer: string;
  origin: string;
  abv: number | null;
  price_glass: number | null;
  price_bottle: number | null;
  order: number;
}

export interface Allergen {
  id: string;
  name_it: string;
  name_en: string;
}

export interface MenuSnapshot {
  sections: Section[];
  categories: Category[];
  dishes: Dish[];
  wineCategories: WineCategory[];
  wines: Wine[];
  allergens: Allergen[];
}
