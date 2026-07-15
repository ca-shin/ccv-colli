import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  supabase,
  loadFullMenu,
  loadSections,
  pingSupabase,
  newId,
  invalidateMenuCache,
  ensureWineSectionIntegrity,
  ensureDishSubtitleColumns,
  ensureDishGlutenFreeColumn,
} from "./supabase";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1909";
const ADMIN_COOKIE_NAME = "ccvcolli_admin";
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 10;
const ADMIN_SETTINGS_TABLE = "admin_settings";
const ADMIN_PASSWORD_HASH_KEY = "admin_password_hash";
const ADMIN_PIN_PATTERN = /^\d{4,12}$/;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const loginRateLimitBuckets = new Map<string, RateLimitBucket>();
let adminPasswordHashLoaded = false;
let cachedAdminPasswordHash: string | null = null;

function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyAdminPasswordHash(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const hash = scryptSync(password, salt, 32).toString("base64url");
  return safeEqual(hash, expectedHash);
}

async function loadAdminPasswordHash(): Promise<string | null> {
  if (adminPasswordHashLoaded) {
    return cachedAdminPasswordHash;
  }

  const { data, error } = await supabase
    .from(ADMIN_SETTINGS_TABLE)
    .select("value")
    .eq("key", ADMIN_PASSWORD_HASH_KEY)
    .maybeSingle();

  if (error) {
    console.warn("Admin settings unavailable; using ADMIN_PASSWORD fallback");
    cachedAdminPasswordHash = null;
    adminPasswordHashLoaded = true;
    return null;
  }

  cachedAdminPasswordHash = data?.value ?? null;
  adminPasswordHashLoaded = true;
  return cachedAdminPasswordHash;
}

async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = await loadAdminPasswordHash();

  if (storedHash) {
    return verifyAdminPasswordHash(password, storedHash);
  }

  return safeEqual(password, ADMIN_PASSWORD);
}

async function saveAdminPassword(password: string): Promise<void> {
  const passwordHash = hashAdminPassword(password);
  const { error } = await supabase
    .from(ADMIN_SETTINGS_TABLE)
    .upsert(
      {
        key: ADMIN_PASSWORD_HASH_KEY,
        value: passwordHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    throw new Error(`Unable to update admin PIN: ${error.message}`);
  }

  cachedAdminPasswordHash = passwordHash;
  adminPasswordHashLoaded = true;
}

function getAdminSessionSecret(): string {
  return `${process.env.SUPABASE_SERVICE_KEY ?? ""}:${cachedAdminPasswordHash ?? ADMIN_PASSWORD}`;
}

function signAdminPayload(payload: string): string {
  return createHmac("sha256", getAdminSessionSecret()).update(payload).digest("base64url");
}

function createAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + ADMIN_SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${signAdminPayload(payload)}`;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, signAdminPayload(payload))) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof session.exp === "number" && session.exp > Date.now();
  } catch {
    return false;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function setAdminCookie(res: Response): void {
  res.cookie(ADMIN_COOKIE_NAME, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_TTL_MS,
    path: "/",
  });
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (verifyAdminToken(readCookie(req, ADMIN_COOKIE_NAME))) {
    return next();
  }

  return res.status(401).json({ success: false, message: "Unauthorized" });
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneExpiredLoginRateLimits(now: number): void {
  for (const [key, bucket] of loginRateLimitBuckets) {
    if (bucket.resetAt <= now) {
      loginRateLimitBuckets.delete(key);
    }
  }
}

function checkLoginRateLimit(req: Request): boolean {
  const now = Date.now();
  const key = getClientIp(req);
  pruneExpiredLoginRateLimits(now);

  const current = loginRateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    loginRateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (current.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  current.count += 1;
  return true;
}

function clearLoginRateLimit(req: Request): void {
  loginRateLimitBuckets.delete(getClientIp(req));
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function includesGlutenAllergen(ids: unknown): Promise<boolean> {
  if (!Array.isArray(ids) || ids.length === 0) return false;

  const cleanIds = ids.filter((id): id is string => typeof id === "string");
  if (cleanIds.includes("gluten")) return true;
  if (cleanIds.length === 0) return false;

  const { data, error } = await supabase
    .from("allergens")
    .select("id, name_it, name_en")
    .in("id", cleanIds);

  if (error) throw new Error(error.message);

  return (data ?? []).some((allergen) => {
    const name = `${normalizeText(allergen.name_it)} ${normalizeText(allergen.name_en)}`;
    return name.includes("glutine") || name.includes("gluten");
  });
}

function sendError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  res.status(500).json({ error: message });
}

async function sendMutatedMenu(res: Response): Promise<void> {
  invalidateMenuCache();
  res.json(await loadFullMenu());
}

function registerReorderRoute(app: Express, route: string, table: string): void {
  app.put(route, async (req, res) => {
    try {
      const { ids } = req.body as { ids: string[] };
      await Promise.all(
        ids.map((id, i) => supabase.from(table).update({ order: i }).eq("id", id))
      );
      await sendMutatedMenu(res);
    } catch (e: any) {
      sendError(res, e);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  await loadAdminPasswordHash();

  // ── Startup integrity checks ──────────────────────────────────────────────────
  // Checks Vini section integrity without mutating production data
  ensureWineSectionIntegrity().then(() => {
    console.log("✓ Wine section integrity check complete");
  });

  // Checks (and reports) if dish subtitle columns exist in the database
  ensureDishSubtitleColumns();
  ensureDishGlutenFreeColumn();

  // ── Health check ─────────────────────────────────────────────────────────────

  app.get("/api/health", async (_req, res) => {
    try {
      await loadFullMenu();
      res.json({ status: "ok", supabase: "connected" });
    } catch {
      res.status(500).json({ status: "error" });
    }
  });

  // ── Supabase heartbeat (keeps free tier awake) ────────────────────────────────

  app.get("/api/heartbeat", async (_req, res) => {
    try {
      await pingSupabase();
      res.json({ status: "ok", message: "Database is awake" });
    } catch {
      res.status(500).json({ status: "error" });
    }
  });

  // ── Public menu endpoints ────────────────────────────────────────────────────

  app.get("/api/menu", async (_req, res) => {
    try {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate");
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/menu/draft", async (_req, res) => {
    try {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate");
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/sections", async (_req, res) => {
    try {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate");
      res.json(await loadSections());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Auth ─────────────────────────────────────────────────────────────────────

  app.post("/api/admin/login", async (req, res) => {
    if (!checkLoginRateLimit(req)) {
      return res.status(429).json({ success: false, message: "Too many attempts" });
    }

    const { password } = req.body;
    if (typeof password === "string" && await verifyAdminPassword(password)) {
      clearLoginRateLimit(req);
      setAdminCookie(res);
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  app.use("/api/admin", requireAdminAuth);

  app.post("/api/admin/password/verify", async (req, res) => {
    const { password } = req.body as { password?: unknown };

    if (typeof password !== "string") {
      return res.status(400).json({ success: false, message: "PIN required" });
    }

    if (await verifyAdminPassword(password)) {
      return res.json({ success: true });
    }

    return res.status(401).json({ success: false, message: "Invalid PIN" });
  });

  app.put("/api/admin/password", async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ success: false, message: "PIN required" });
    }

    if (!ADMIN_PIN_PATTERN.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New PIN must contain 4 to 12 digits",
      });
    }

    if (!await verifyAdminPassword(currentPassword)) {
      return res.status(401).json({ success: false, message: "Invalid current PIN" });
    }

    try {
      await saveAdminPassword(newPassword);
      setAdminCookie(res);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // ── Reorder endpoints ────────────────────────────────────────────────────────

  registerReorderRoute(app, "/api/admin/sections/reorder", "sections");
  registerReorderRoute(app, "/api/admin/categories/reorder", "categories");
  registerReorderRoute(app, "/api/admin/dishes/reorder", "dishes");
  registerReorderRoute(app, "/api/admin/wine-categories/reorder", "wine_categories");
  registerReorderRoute(app, "/api/admin/wines/reorder", "wines");

  // ── Sections CRUD ────────────────────────────────────────────────────────────

  app.post("/api/admin/sections", async (req, res) => {
    try {
      const { name_it, name_en, subtitle_it, subtitle_en, type, insertAtOrder } = req.body;
      if (insertAtOrder != null) {
        // Sposta in avanti tutte le sezioni con order >= insertAtOrder
        const { data: toShift } = await supabase
          .from("sections")
          .select("id, order")
          .gte("order", insertAtOrder);
        if (toShift && toShift.length > 0) {
          await Promise.all(
            toShift.map((s: { id: string; order: number }) =>
              supabase.from("sections").update({ order: s.order + 1 }).eq("id", s.id)
            )
          );
        }
        await supabase.from("sections").insert({
          id: newId(), name_it, name_en,
          subtitle_it: subtitle_it ?? null,
          subtitle_en: subtitle_en ?? null,
          type: type ?? null,
          order: insertAtOrder,
        });
      } else {
        const { data: existing } = await supabase.from("sections").select("order").order("order", { ascending: false }).limit(1);
        const maxOrder = existing?.[0]?.order ?? 0;
        await supabase.from("sections").insert({
          id: newId(), name_it, name_en,
          subtitle_it: subtitle_it ?? null,
          subtitle_en: subtitle_en ?? null,
          type: type ?? null,
          order: maxOrder + 1,
        });
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en, subtitle_it, subtitle_en, type, order } = req.body;
      const update: Record<string, unknown> = {
        name_it, name_en,
        subtitle_it: subtitle_it ?? null,
        subtitle_en: subtitle_en ?? null,
      };
      if (type) update.type = type;
      if (order != null) update.order = order;
      await supabase.from("sections").update(update).eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/sections/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body as { direction: "up" | "down" };
      const { data: sections } = await supabase.from("sections").select("id, order").order("order");
      if (!sections) return res.json(await loadFullMenu());
      const idx = sections.findIndex((s) => s.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < sections.length) {
        const a = sections[idx];
        const b = sections[swapIdx];
        await Promise.all([
          supabase.from("sections").update({ order: b.order }).eq("id", a.id),
          supabase.from("sections").update({ order: a.order }).eq("id", b.id),
        ]);
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Categories CRUD ──────────────────────────────────────────────────────────

  app.post("/api/admin/categories", async (req, res) => {
    try {
      const { section_id, name_it, name_en } = req.body;
      const { data: existing } = await supabase.from("categories").select("order").eq("section_id", section_id).order("order", { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.order ?? 0;
      await supabase.from("categories").insert({ id: newId(), section_id, name_it, name_en, order: maxOrder + 1 });
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en } = req.body;
      await supabase.from("categories").update({ name_it, name_en }).eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { data: section } = await supabase.from("sections").select("type").eq("id", id).single();
      if (section?.type === "wine") {
        return res.status(403).json({ error: "Cannot delete protected wine section" });
      }
      const { data: cats } = await supabase.from("categories").select("id").eq("section_id", id);
      if (cats && cats.length > 0) {
        const catIds = cats.map(c => c.id);
        await supabase.from("dishes").delete().in("category_id", catIds);
      }
      await supabase.from("categories").delete().eq("section_id", id);
      await supabase.from("sections").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await supabase.from("dishes").delete().eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/categories/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body as { direction: "up" | "down" };
      const { data: cat } = await supabase.from("categories").select("section_id").eq("id", id).single();
      if (!cat) return res.json(await loadFullMenu());
      const { data: siblings } = await supabase.from("categories").select("id, order").eq("section_id", cat.section_id).order("order");
      if (!siblings) return res.json(await loadFullMenu());
      const idx = siblings.findIndex((c) => c.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < siblings.length) {
        const a = siblings[idx];
        const b = siblings[swapIdx];
        await Promise.all([
          supabase.from("categories").update({ order: b.order }).eq("id", a.id),
          supabase.from("categories").update({ order: a.order }).eq("id", b.id),
        ]);
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Dishes CRUD ──────────────────────────────────────────────────────────────

  app.post("/api/admin/dishes", async (req, res) => {
    try {
      const { category_id, name_it, name_en, subtitle_it, subtitle_en, description_it, description_en, price, vegetarian, gluten_free, allergens, extra_info } = req.body;
      const dishAllergens = Array.isArray(allergens) ? allergens : [];
      const glutenFreeAllowed = !!gluten_free && !(await includesGlutenAllergen(dishAllergens));
      const { data: existing } = await supabase.from("dishes").select("order").eq("category_id", category_id).order("order", { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.order ?? 0;
      const baseRow = {
        id: newId(), category_id, name_it, name_en,
        description_it: description_it || "",
        description_en: description_en || "",
        price: price != null ? parseFloat(price) : null,
        vegetarian: !!vegetarian,
        gluten_free: glutenFreeAllowed,
        allergens: dishAllergens,
        extra_info: extra_info || "",
        order: maxOrder + 1,
      };
      const subtitleRow = {
        ...baseRow,
        subtitle_it: subtitle_it ? subtitle_it.charAt(0).toUpperCase() + subtitle_it.slice(1) : "",
        subtitle_en: subtitle_en ? subtitle_en.charAt(0).toUpperCase() + subtitle_en.slice(1) : "",
      };
      // Try with subtitle columns first; fall back without if columns don't exist yet
      const { error: err1 } = await supabase.from("dishes").insert(subtitleRow);
      if (err1) {
        if (err1.message.includes("subtitle")) {
          const { error: err2 } = await supabase.from("dishes").insert(baseRow);
          if (err2) throw new Error(err2.message);
        } else {
          throw new Error(err1.message);
        }
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/dishes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en, subtitle_it, subtitle_en, description_it, description_en, price, vegetarian, gluten_free, allergens, extra_info } = req.body;
      const dishAllergens = Array.isArray(allergens) ? allergens : [];
      const glutenFreeAllowed = !!gluten_free && !(await includesGlutenAllergen(dishAllergens));
      const baseUpdate = {
        name_it, name_en,
        description_it: description_it || "",
        description_en: description_en || "",
        price: price != null ? parseFloat(price) : null,
        vegetarian: !!vegetarian,
        gluten_free: glutenFreeAllowed,
        allergens: dishAllergens,
        extra_info: extra_info || "",
      };
      const subtitleUpdate = {
        ...baseUpdate,
        subtitle_it: subtitle_it ? subtitle_it.charAt(0).toUpperCase() + subtitle_it.slice(1) : "",
        subtitle_en: subtitle_en ? subtitle_en.charAt(0).toUpperCase() + subtitle_en.slice(1) : "",
      };
      // Try with subtitle columns first; fall back without if columns don't exist yet
      const { error: err1 } = await supabase.from("dishes").update(subtitleUpdate).eq("id", id);
      if (err1) {
        if (err1.message.includes("subtitle")) {
          const { error: err2 } = await supabase.from("dishes").update(baseUpdate).eq("id", id);
          if (err2) throw new Error(err2.message);
        } else {
          throw new Error(err1.message);
        }
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/dishes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await supabase.from("dishes").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/dishes/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body as { direction: "up" | "down" };
      const { data: dish } = await supabase.from("dishes").select("category_id").eq("id", id).single();
      if (!dish) return res.json(await loadFullMenu());
      const { data: siblings } = await supabase.from("dishes").select("id, order").eq("category_id", dish.category_id).order("order");
      if (!siblings) return res.json(await loadFullMenu());
      const idx = siblings.findIndex((d) => d.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < siblings.length) {
        const a = siblings[idx];
        const b = siblings[swapIdx];
        await Promise.all([
          supabase.from("dishes").update({ order: b.order }).eq("id", a.id),
          supabase.from("dishes").update({ order: a.order }).eq("id", b.id),
        ]);
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Wine Categories CRUD ─────────────────────────────────────────────────────

  app.post("/api/admin/wine-categories", async (req, res) => {
    try {
      const { name_it, name_en } = req.body;
      const { data: existing } = await supabase.from("wine_categories").select("order").order("order", { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.order ?? 0;
      await supabase.from("wine_categories").insert({ id: newId(), name_it, name_en, order: maxOrder + 1 });
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/wine-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en } = req.body;
      await supabase.from("wine_categories").update({ name_it, name_en }).eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/wine-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await supabase.from("wines").delete().eq("wine_category_id", id);
      await supabase.from("wine_categories").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/wine-categories/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body as { direction: "up" | "down" };
      const { data: cats } = await supabase.from("wine_categories").select("id, order").order("order");
      if (!cats) return res.json(await loadFullMenu());
      const idx = cats.findIndex((w) => w.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < cats.length) {
        const a = cats[idx];
        const b = cats[swapIdx];
        await Promise.all([
          supabase.from("wine_categories").update({ order: b.order }).eq("id", a.id),
          supabase.from("wine_categories").update({ order: a.order }).eq("id", b.id),
        ]);
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Wines CRUD ───────────────────────────────────────────────────────────────

  app.post("/api/admin/wines", async (req, res) => {
    try {
      const { wine_category_id, name_it, name_en, producer, origin, abv, price_glass, price_bottle } = req.body;
      const { data: existing } = await supabase.from("wines").select("order").eq("wine_category_id", wine_category_id).order("order", { ascending: false }).limit(1);
      const maxOrder = existing?.[0]?.order ?? 0;
      await supabase.from("wines").insert({
        id: newId(), wine_category_id, name_it, name_en,
        producer: producer || "",
        origin: origin || "",
        abv: abv != null ? parseFloat(abv) : null,
        price_glass: price_glass != null ? parseFloat(price_glass) : null,
        price_bottle: price_bottle != null ? parseFloat(price_bottle) : null,
        order: maxOrder + 1,
      });
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en, producer, origin, abv, price_glass, price_bottle } = req.body;
      await supabase.from("wines").update({
        name_it, name_en,
        producer: producer || "",
        origin: origin || "",
        abv: abv != null ? parseFloat(abv) : null,
        price_glass: price_glass != null ? parseFloat(price_glass) : null,
        price_bottle: price_bottle != null ? parseFloat(price_bottle) : null,
      }).eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await supabase.from("wines").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/wines/:id/order", async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body as { direction: "up" | "down" };
      const { data: wine } = await supabase.from("wines").select("wine_category_id").eq("id", id).single();
      if (!wine) return res.json(await loadFullMenu());
      const { data: siblings } = await supabase.from("wines").select("id, order").eq("wine_category_id", wine.wine_category_id).order("order");
      if (!siblings) return res.json(await loadFullMenu());
      const idx = siblings.findIndex((w) => w.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < siblings.length) {
        const a = siblings[idx];
        const b = siblings[swapIdx];
        await Promise.all([
          supabase.from("wines").update({ order: b.order }).eq("id", a.id),
          supabase.from("wines").update({ order: a.order }).eq("id", b.id),
        ]);
      }
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Allergens CRUD ───────────────────────────────────────────────────────────

  app.post("/api/admin/allergens", async (req, res) => {
    try {
      const { name_it, name_en } = req.body;
      if (!name_it) return res.status(400).json({ error: "name_it required" });
      await supabase.from("allergens").insert({ id: newId(), name_it, name_en: name_en || name_it });
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/allergens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name_it, name_en } = req.body;
      await supabase.from("allergens").update({ name_it, name_en: name_en || name_it }).eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/allergens/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { data: affected } = await supabase.from("dishes").select("id, allergens").contains("allergens", [id]);
      if (affected && affected.length > 0) {
        await Promise.all(
          affected.map((d) =>
            supabase.from("dishes").update({
              allergens: (d.allergens as string[]).filter((a: string) => a !== id),
            }).eq("id", d.id)
          )
        );
      }
      await supabase.from("allergens").delete().eq("id", id);
      invalidateMenuCache();
      res.json(await loadFullMenu());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
