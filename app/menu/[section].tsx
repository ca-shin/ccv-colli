import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MenuSnapshot, Dish, Wine } from "@/shared/schema";
import { Colors } from "@/constants/colors";
import { menuSectionStyles as styles } from "@/components/menu/menuSectionStyles";

type Lang = "it" | "en";
const glutenFreeIconSource = require("@/assets/images/icons8-senza-glutine-100.png");

// Special section ID for wines (uses separate wine_categories/wines tables)
const WINES_SECTION_ID = "__vini__";
const PUBLIC_MENU_STALE_TIME_MS = 30000;

function formatPrice(price: number | null): string {
  if (price === null) return "";
  if (price % 1 === 0) return `€ ${Math.round(price)}`;
  return `€ ${price.toFixed(1).replace(".", ",")}`;
}

// ── Hamburger Dropdown (nav between sections) ─────────────────────────────────

const HamburgerDropdown = React.memo(function HamburgerDropdown({
  lang,
  currentSectionId,
  onLangChange,
  onSectionChange,
  onClose,
  topOffset,
  menu,
  englishEnabled,
}: {
  lang: Lang;
  currentSectionId: string;
  onLangChange: (l: Lang) => void;
  onSectionChange: (id: string) => void;
  onClose: () => void;
  topOffset: number;
  menu?: MenuSnapshot;
  englishEnabled: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 120, useNativeDriver: false }),
    ]).start();
  }, [opacity, translateY]);

  const close = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: -8, duration: 100, useNativeDriver: false }),
    ]).start(() => { onClose(); cb?.(); });
  }, [onClose, opacity, translateY]);

  const handleNavPress = useCallback((id: string) => {
    close(() => onSectionChange(id));
  }, [close, onSectionChange]);

  const handleLangChange = useCallback((l: Lang) => {
    onLangChange(l);
    close();
  }, [onLangChange, close]);

  const handleAdmin = useCallback(() => {
    close(() => router.push("/admina"));
  }, [close]);

  const handleHome = useCallback(() => {
    close(() => router.replace("/"));
  }, [close]);

  // Build nav items from dynamic sections (Vini is already included as a DB section)
  const navItems = useMemo(() => {
    if (!menu) return [];
    return [...menu.sections]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ id: s.id, it: s.name_it, en: s.name_en || s.name_it }));
  }, [menu]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()}>
      <Pressable style={styles.menuOverlay} onPress={() => close()}>
        <Animated.View
          style={[
            styles.menuDropdown,
            { top: topOffset, opacity, transform: [{ translateY }] },
          ]}
        >
          {/* Back to home */}
          <Pressable style={styles.menuItem} onPress={handleHome}>
            <Text style={styles.menuItemText}>Home</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          {/* Section nav */}
          {navItems.map((item) => (
            <Pressable key={item.id} style={styles.menuItem} onPress={() => handleNavPress(item.id)}>
              <Text
                style={
                  item.id === currentSectionId
                    ? [styles.menuItemText, styles.menuItemTextActive]
                    : styles.menuItemText
                }
              >
                {lang === "it" ? item.it : item.en}
              </Text>
              {item.id === currentSectionId && <View style={styles.menuItemDot} />}
            </Pressable>
          ))}

          <View style={styles.menuDivider} />

          {/* Language & Admin */}
          <View style={styles.menuLangSection}>
            <View style={styles.menuLangRow}>
              <Pressable
                style={lang === "it" ? [styles.menuLangBtn, styles.menuLangBtnActive] : styles.menuLangBtn}
                onPress={() => handleLangChange("it")}
              >
                <Text style={lang === "it" ? [styles.menuLangText, styles.menuLangTextActive] : styles.menuLangText}>
                  Italiano
                </Text>
              </Pressable>
              {englishEnabled && (
                <Pressable
                  style={lang === "en" ? [styles.menuLangBtn, styles.menuLangBtnActive] : styles.menuLangBtn}
                  onPress={() => handleLangChange("en")}
                >
                  <Text style={lang === "en" ? [styles.menuLangText, styles.menuLangTextActive] : styles.menuLangText}>
                    English
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable style={styles.menuAdminBtn} onPress={handleAdmin}>
              <Ionicons name="settings-outline" size={16} color={Colors.warmBrown} />
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

// ── Dish Detail Modal ─────────────────────────────────────────────────────────

function DishModal({ dish, lang, allergens, onClose }: {
  dish: Dish;
  lang: Lang;
  allergens: MenuSnapshot["allergens"];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dishAllergens = useMemo(
    () => allergens.filter((a) => dish.allergens.includes(a.id)),
    [dish.allergens, allergens]
  );

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View
        style={[
          styles.modalContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.modalHandle} />
        <Pressable style={styles.modalClose} onPress={onClose}>
          <Ionicons name="close" size={18} color={Colors.warmBrown} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
          <View style={styles.modalHeader}>
            {dish.vegetarian && (
              <View style={styles.vegBadge}>
                <Ionicons name="leaf" size={11} color={Colors.leafGreen} />
                <Text style={styles.vegBadgeText}>
                  {lang === "it" ? "Vegetariano" : "Vegetarian"}
                </Text>
              </View>
            )}
            {dish.gluten_free && (
              <View style={styles.glutenFreeBadge}>
                <Image source={glutenFreeIconSource} style={styles.glutenFreeBadgeIcon} />
                <Text style={styles.glutenFreeBadgeText}>
                  {lang === "it" ? "Senza glutine" : "Gluten free"}
                </Text>
              </View>
            )}
            <Text style={styles.modalDishName}>
              {lang === "it" ? dish.name_it : dish.name_en}
            </Text>
            {dish.price !== null && (
              <Text style={styles.modalPrice}>{formatPrice(dish.price)}</Text>
            )}
          </View>

          {(lang === "it" ? dish.description_it : dish.description_en) ? (
            <View style={styles.modalSection}>
              <Text style={styles.modalDescription}>
                {lang === "it" ? dish.description_it : dish.description_en}
              </Text>
            </View>
          ) : null}

          {dish.extra_info ? (
            <View style={styles.modalInfoBox}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.gold} />
              <Text style={styles.modalInfoText}>{dish.extra_info}</Text>
            </View>
          ) : null}

          {dishAllergens.length > 0 && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>
                {lang === "it" ? "Allergeni" : "Allergens"}
              </Text>
              {dishAllergens.map((a) => (
                <View key={a.id} style={styles.allergenRow}>
                  <View style={styles.allergenDot} />
                  <Text style={styles.allergenText}>
                    {lang === "it" ? a.name_it : a.name_en}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Dish Row ──────────────────────────────────────────────────────────────────

const DishRow = React.memo(function DishRow({ dish, lang, onPress }: { dish: Dish; lang: Lang; onPress: () => void }) {
  const hasDetail = !!(dish.description_it || dish.description_en || dish.extra_info || dish.allergens.length > 0);
  const name = lang === "it" ? dish.name_it : dish.name_en;
  const subtitle = lang === "it" ? dish.subtitle_it : dish.subtitle_en;

  return (
    <Pressable
      onPress={hasDetail ? onPress : undefined}
      style={({ pressed }) => [styles.dishRow, pressed && hasDetail && { opacity: 0.65 }]}
    >
      <View style={styles.dishNameRow}>
        {(dish.vegetarian || dish.gluten_free) && (
          <View style={styles.dishDietIconRow}>
            {dish.vegetarian && (
              <Ionicons name="leaf" size={13} color={Colors.leafGreen} />
            )}
            {dish.gluten_free && (
              <Image source={glutenFreeIconSource} style={styles.dishGlutenFreeImage} />
            )}
          </View>
        )}
        <Text style={styles.dishName}>{name}</Text>
      </View>
      {!!subtitle && (
        <Text style={styles.dishSubtitle}>{subtitle}</Text>
      )}
      {dish.price !== null && (
        <Text style={styles.dishPrice}>{formatPrice(dish.price)}</Text>
      )}
    </Pressable>
  );
});

// ── Wine Row ──────────────────────────────────────────────────────────────────

const WineRow = React.memo(function WineRow({ wine, lang }: { wine: Wine; lang: Lang }) {
  const formatProducer = (p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  return (
    <View style={styles.wineRow}>
      <Text style={styles.wineName}>
        {lang === "it" ? wine.name_it : wine.name_en}
      </Text>
      <Text style={styles.wineDescription}>
        {formatProducer(wine.producer)} - {wine.origin.toUpperCase()}
        {wine.abv != null && ` - ${wine.abv}°`}
      </Text>
      <View style={styles.winePriceRow}>
        {wine.price_glass !== null && (
          <Text style={styles.winePrice}>{formatPrice(wine.price_glass)}</Text>
        )}
        {wine.price_bottle !== null && (
          <Text style={[styles.winePrice, wine.price_glass !== null && { marginLeft: 24 }]}>
            {formatPrice(wine.price_bottle)}
          </Text>
        )}
      </View>
    </View>
  );
});

// ── Category Block ────────────────────────────────────────────────────────────

function CategoryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.categoryBlock}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Section Content (generic categories + dishes) ─────────────────────────────

function SectionContent({ data, lang, sectionId, onDishSelect }: {
  data: MenuSnapshot;
  lang: Lang;
  sectionId: string;
  onDishSelect: (dish: Dish) => void;
}) {
  const cats = data.categories
    .filter((c) => c.section_id === sectionId)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {cats.map((cat) => {
        const dishes = data.dishes
          .filter((d) => d.category_id === cat.id)
          .sort((a, b) => a.order - b.order);

        if (dishes.length === 0) return null;

        return (
          <CategoryBlock key={cat.id} title={lang === "it" ? cat.name_it : cat.name_en}>
            {dishes.map((dish, idx) => (
              <React.Fragment key={dish.id}>
                <DishRow dish={dish} lang={lang} onPress={() => onDishSelect(dish)} />
                {idx < dishes.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </CategoryBlock>
        );
      })}
    </>
  );
}

// ── Wines Content ─────────────────────────────────────────────────────────────

function WinesContent({ data, lang }: { data: MenuSnapshot; lang: Lang }) {
  const sorted = [...data.wineCategories].sort((a, b) => a.order - b.order);

  return (
    <>
      {sorted.map((wcat) => {
        const wines = data.wines
          .filter((w) => w.wine_category_id === wcat.id)
          .sort((a, b) => a.order - b.order);

        if (wines.length === 0) return null;

        return (
          <CategoryBlock key={wcat.id} title={lang === "it" ? wcat.name_it : wcat.name_en}>
            {wines.map((wine, idx) => (
              <React.Fragment key={wine.id}>
                <WineRow wine={wine} lang={lang} />
                {idx < wines.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </CategoryBlock>
        );
      })}
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MenuSectionScreen() {
  const { section: rawSection, lang: rawLang } = useLocalSearchParams<{
    section: string;
    lang: string;
  }>();

  const [sectionId, setSectionId] = useState<string>(rawSection ?? "");
  const [lang, setLang] = useState<Lang>((rawLang ?? "it") as Lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [englishEnabled, setEnglishEnabled] = useState(false);

  // Load English enabled state from AsyncStorage
  useEffect(() => {
    const loadEnglishState = async () => {
      try {
        const stored = await AsyncStorage.getItem("englishEnabled");
        const isEnabled = stored !== null ? JSON.parse(stored) : false;
        setEnglishEnabled(isEnabled);
        // If English is disabled and user is on English, switch to Italian
        if (!isEnabled && lang === "en") {
          setLang("it");
        }
      } catch (e) {
        console.error("Error loading English state:", e);
      }
    };
    loadEnglishState();
  }, [lang]);

  const handleDishSelect = useCallback((dish: Dish) => {
    setSelectedDish(dish);
  }, []);

  const handleCloseDish = useCallback(() => {
    setSelectedDish(null);
  }, []);

  const insets = useSafeAreaInsets();
  const topInset = insets.top + 67;
  const bottomInset = insets.bottom + 34;
  const HEADER_H = 73;

  const { data, isLoading, error, refetch } = useQuery<MenuSnapshot>({
    queryKey: ["/api/menu/draft"],
    staleTime: PUBLIC_MENU_STALE_TIME_MS,
  });

  // Once data is loaded, resolve the section ID from the route param
  const resolvedSectionId = useMemo(() => {
    if (!data) return sectionId;
    // If it's the legacy wine sentinel, find the real wine section ID
    if (sectionId === WINES_SECTION_ID) {
      const wine = data.sections.find((s) => s.type === "wine");
      return wine?.id ?? WINES_SECTION_ID;
    }
    // If it's a known section ID, keep it
    if (data.sections.find((s) => s.id === sectionId)) return sectionId;
    // Legacy: match by type or name (backward compat with old QR codes)
    const byType = data.sections.find(
      (s) => s.type === sectionId || s.name_it.toLowerCase() === sectionId
    );
    if (byType) return byType.id;
    // Default to first section
    return [...data.sections].sort((a, b) => a.order - b.order)[0]?.id ?? "";
  }, [data, sectionId]);

  // Determine if the active section is the wine section (by type)
  const isWineSection = useMemo(() => {
    if (!data) return false;
    const section = data.sections.find((s) => s.id === resolvedSectionId);
    return section?.type === "wine";
  }, [data, resolvedSectionId]);

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topInset, height: topInset + HEADER_H }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLogo}>
            <Image
              source={require("@/assets/images/logo-cashin2.webp")}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Pressable
          style={[styles.menuButton, { top: topInset + 8 }]}
          onPress={() => setMenuOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </Pressable>
      </View>

      {/* ── Scroll ──────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topInset + HEADER_H,
          paddingBottom: bottomInset + 64,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.maroon} size="small" />
          </View>
        )}

        {error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>
              {lang === "it" ? "Errore nel caricamento." : "Error loading menu."}
            </Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>{lang === "it" ? "Riprova" : "Retry"}</Text>
            </Pressable>
          </View>
        )}

        {data && (
          isWineSection ? (
            <WinesContent data={data} lang={lang} />
          ) : (
            <SectionContent
              data={data}
              lang={lang}
              sectionId={resolvedSectionId}
              onDishSelect={handleDishSelect}
            />
          )
        )}

        {/* ── Credit footer (rimosso, visibile solo in home) ── */}
      </ScrollView>

      {/* ── Hamburger dropdown ───────────────────────────── */}
      {menuOpen && (
        <HamburgerDropdown
          lang={lang}
          currentSectionId={resolvedSectionId}
          onLangChange={setLang}
          onSectionChange={setSectionId}
          onClose={() => setMenuOpen(false)}
          topOffset={topInset + HEADER_H + 8}
          menu={data}
          englishEnabled={englishEnabled}
        />
      )}

      {/* ── Dish modal ───────────────────────────────────── */}
      {selectedDish && data && (
        <DishModal
          dish={selectedDish}
          lang={lang}
          allergens={data.allergens}
          onClose={handleCloseDish}
        />
      )}
    </View>
  );
}
