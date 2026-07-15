import { createClient } from "@supabase/supabase-js";
import type { MenuSnapshot } from "../shared/schema";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const MENU_CACHE_TTL_MS = Number(process.env.MENU_CACHE_TTL_MS ?? 30000);
const SECTION_COLUMNS = "id, name_it, name_en, subtitle_it, subtitle_en, order, type";
const CATEGORY_COLUMNS = "id, section_id, name_it, name_en, order";
const DISH_COLUMNS = "id, category_id, name_it, name_en, subtitle_it, subtitle_en, description_it, description_en, price, vegetarian, gluten_free, allergens, extra_info, order";
const WINE_CATEGORY_COLUMNS = "id, name_it, name_en, order";
const WINE_COLUMNS = "id, wine_category_id, name_it, name_en, producer, origin, abv, price_glass, price_bottle, order";
const ALLERGEN_COLUMNS = "id, name_it, name_en";
const SUPABASE_PING_TIMEOUT_MS = Number(process.env.SUPABASE_PING_TIMEOUT_MS ?? 10000);

// In-memory cache to avoid hammering Supabase during mobile navigation bursts.
let cachedMenu: MenuSnapshot | null = null;
let cacheExpireAt: number = 0;
let cachedSections: MenuSnapshot["sections"] | null = null;
let sectionsCacheExpireAt: number = 0;

export function invalidateMenuCache(): void {
  cachedMenu = null;
  cacheExpireAt = 0;
  cachedSections = null;
  sectionsCacheExpireAt = 0;
}

export async function pingSupabase(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_PING_TIMEOUT_MS);

  try {
    const { error } = await supabase
      .from("sections")
      .select("id")
      .limit(1)
      .abortSignal(controller.signal);

    if (error) {
      throw new Error(`Supabase ping error: ${error.message}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadFullMenu(): Promise<MenuSnapshot> {
  // Return cached menu if still valid
  if (cachedMenu && Date.now() < cacheExpireAt) {
    return cachedMenu;
  }
  const [
    { data: sections, error: e1 },
    { data: categories, error: e2 },
    { data: dishes, error: e3 },
    { data: wineCategories, error: e4 },
    { data: wines, error: e5 },
    { data: allergens, error: e6 },
  ] = await Promise.all([
    supabase.from("sections").select(SECTION_COLUMNS).order("order"),
    supabase.from("categories").select(CATEGORY_COLUMNS).order("order"),
    supabase.from("dishes").select(DISH_COLUMNS).order("order"),
    supabase.from("wine_categories").select(WINE_CATEGORY_COLUMNS).order("order"),
    supabase.from("wines").select(WINE_COLUMNS).order("order"),
    supabase.from("allergens").select(ALLERGEN_COLUMNS),
  ]);

  for (const err of [e1, e2, e3, e4, e5, e6]) {
    if (err) throw new Error(`Supabase loadFullMenu error: ${err.message}`);
  }

  const menu: MenuSnapshot = {
    sections: (sections ?? []).map(s => ({ ...s, type: s.type || null })),
    categories: categories ?? [],
    dishes: dishes ?? [],
    wineCategories: wineCategories ?? [],
    wines: wines ?? [],
    allergens: allergens ?? [],
  };

  // Admin mutations explicitly invalidate this cache.
  cachedMenu = menu;
  cacheExpireAt = Date.now() + MENU_CACHE_TTL_MS;
  cachedSections = menu.sections;
  sectionsCacheExpireAt = cacheExpireAt;

  return menu;
}

export async function loadSections(): Promise<MenuSnapshot["sections"]> {
  const now = Date.now();

  if (cachedMenu && now < cacheExpireAt) {
    return cachedMenu.sections;
  }

  if (cachedSections && now < sectionsCacheExpireAt) {
    return cachedSections;
  }

  const { data: sections, error } = await supabase
    .from("sections")
    .select(SECTION_COLUMNS)
    .order("order");

  if (error) throw new Error(`Supabase loadSections error: ${error.message}`);

  cachedSections = (sections ?? []).map(s => ({ ...s, type: s.type || null }));
  sectionsCacheExpireAt = now + MENU_CACHE_TTL_MS;

  return cachedSections;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Tracks if subtitle columns exist in dishes table (set at startup).
 */
export let dishSubtitleColumnsExist = false;
export let dishGlutenFreeColumnExist = false;

/**
 * Checks if subtitle_it / subtitle_en columns exist in the dishes table.
 * If not, logs the SQL migration the admin must run.
 * Runs once at server startup.
 */
export async function ensureDishSubtitleColumns(): Promise<void> {
  try {
    // Try to select subtitle_it — if the column doesn't exist, Supabase returns an error
    const { error } = await supabase
      .from("dishes")
      .select("subtitle_it")
      .limit(1);

    if (error && error.message.includes("subtitle_it")) {
      console.warn("⚠️  Dish subtitle columns not found in DB. Run this SQL in Supabase SQL Editor:");
      console.warn("    ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS subtitle_it TEXT DEFAULT '';");
      console.warn("    ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS subtitle_en TEXT DEFAULT '';");
      dishSubtitleColumnsExist = false;
    } else {
      dishSubtitleColumnsExist = true;
      console.log("✓ Dish subtitle columns verified");
    }
  } catch (e: any) {
    console.error("ensureDishSubtitleColumns error:", e.message);
    dishSubtitleColumnsExist = false;
  }
}

/**
 * Checks if gluten_free exists in the dishes table.
 * Runs once at server startup.
 */
export async function ensureDishGlutenFreeColumn(): Promise<void> {
  try {
    const { error } = await supabase
      .from("dishes")
      .select("gluten_free")
      .limit(1);

    if (error && error.message.includes("gluten_free")) {
      console.warn("⚠️  Dish gluten_free column not found in DB. Run this SQL in Supabase SQL Editor:");
      console.warn("    ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS gluten_free BOOLEAN NOT NULL DEFAULT false;");
      dishGlutenFreeColumnExist = false;
    } else {
      dishGlutenFreeColumnExist = true;
      console.log("✓ Dish gluten_free column verified");
    }
  } catch (e: any) {
    console.error("ensureDishGlutenFreeColumn error:", e.message);
    dishGlutenFreeColumnExist = false;
  }
}

/**
 * Checks that exactly one wine section exists.
 * Runs once at server startup and never mutates production data.
 */
export async function ensureWineSectionIntegrity(): Promise<void> {
  try {
    const { data: allSections } = await supabase
      .from("sections")
      .select("id, name_it, type, order")
      .order("order", { ascending: true });

    if (!allSections) return;

    const wineSections = allSections.filter(
      (s) => s.type === "wine" || s.name_it?.toLowerCase() === "vini"
    );

    if (wineSections.length === 0) {
      console.warn("⚠️  No Vini section found. Create one manually with type='wine'.");
    } else if (wineSections.length > 1) {
      console.warn(`⚠️  Found ${wineSections.length} Vini-like sections. Resolve duplicates manually.`);
    } else if (wineSections[0].type !== "wine") {
      console.warn("⚠️  Vini section found without type='wine'. Update it manually.");
    }
  } catch (e: any) {
    console.error("ensureWineSectionIntegrity error:", e.message);
  }
}
