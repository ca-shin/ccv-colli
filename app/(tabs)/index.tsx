import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Modal,
  Image,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@/constants/colors";
import type { MenuSnapshot, Section } from "@/shared/schema";
import { homeStyles as styles } from "@/components/home/homeStyles";

type Lang = "it" | "en";
const PUBLIC_MENU_STALE_TIME_MS = 30000;
const DEROARTS_MAILTO = "mailto:dero975@gmail.com";

// ── Hamburger Dropdown ────────────────────────────────────────────────────────

const HamburgerDropdown = React.memo(function HamburgerDropdown({
  lang,
  onLangChange,
  onClose,
  topOffset,
  englishEnabled,
}: {
  lang: Lang;
  onLangChange: (l: Lang) => void;
  onClose: () => void;
  topOffset: number;
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

  const handleLangChange = useCallback((l: Lang) => {
    onLangChange(l);
    close();
  }, [onLangChange, close]);

  const handleAdmin = useCallback(() => {
    close(() => router.replace("/admina"));
  }, [close]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()}>
      <Pressable style={styles.menuOverlay} onPress={() => close()}>
        <Animated.View
          style={[
            styles.menuDropdown,
            { top: topOffset, opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionLabel}>{lang === "it" ? "Lingua" : "Language"}</Text>
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
              <Pressable style={styles.menuAdminBtn} onPress={handleAdmin}>
                <Ionicons name="settings-outline" size={16} color={Colors.warmBrown} />
              </Pressable>
            </View>
          </View>
          <View style={styles.menuDivider} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ section, lang, isLast }: {
  section: { id: string; name_it: string; name_en: string };
  lang: Lang;
  isLast?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: false, friction: 8 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: false, friction: 8 }).start();

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.card}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() =>
          router.push({ pathname: "/menu/[section]", params: { section: section.id, lang } })
        }
      >
        <Text style={styles.cardTitle}>
          {lang === "it" ? section.name_it : (section.name_en || section.name_it)}
        </Text>
      </Pressable>
      {!isLast && <View style={styles.cardSeparator} />}
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [lang, setLang] = useState<Lang>("it");
  const [menuOpen, setMenuOpen] = useState(false);
  const [englishEnabled, setEnglishEnabled] = useState(false);

  const { data: sections } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
    staleTime: PUBLIC_MENU_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!sections?.length) return;

    void queryClient.prefetchQuery<MenuSnapshot>({
      queryKey: ["/api/menu/draft"],
      staleTime: PUBLIC_MENU_STALE_TIME_MS,
    });
  }, [queryClient, sections?.length]);

  useEffect(() => {
    const loadEnglishState = async () => {
      try {
        const stored = await AsyncStorage.getItem("englishEnabled");
        const isEnabled = stored !== null ? JSON.parse(stored) : false;
        setEnglishEnabled(isEnabled);
        if (!isEnabled && lang === "en") {
          setLang("it");
        }
      } catch (e) {
        console.error("Error loading English state:", e);
      }
    };

    loadEnglishState();
  }, [lang]);

  // Sezioni dinamiche dal DB (Vini è già inclusa come sezione con type="wine")
  const SECTIONS = useMemo(() => {
    if (!sections) return [];
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  const topInset = insets.top + 67;
  const HEADER_H = 73;

  const handleDeroArtsPress = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = DEROARTS_MAILTO;
      return;
    }

    void Linking.openURL(DEROARTS_MAILTO);
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topInset, height: topInset + HEADER_H }]}>
        <View style={styles.headerContent}>
          {/* Spacer left */}
          <View style={styles.headerSide} />

          {/* Logo centered */}
          <View style={styles.headerLogo}>
            <Image
              source={require("@/assets/images/logo-cashin2.webp")}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>

          {/* Spacer right */}
          <View style={styles.headerSide} />
        </View>
        <View style={styles.headerLine} />
      </View>

      {/* ── Section cards ────────────────────────────────── */}
      <View style={styles.centerStage}>
        <View style={styles.cards}>
          {SECTIONS.map((s, index) => (
            <SectionCard key={s.id} section={s} lang={lang} isLast={index === SECTIONS.length - 1} />
          ))}
        </View>
      </View>

      {/* ── Credit footer ─────────────────────────────────── */}
      <View style={[styles.footer, { bottom: topInset }]}>
        <Text style={styles.footerLine1}>in collaborazione con</Text>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
      </View>

      <Pressable
        style={[styles.poweredByLink, { bottom: Math.max(insets.bottom + 10, 10) }]}
        onPress={handleDeroArtsPress}
      >
        <Text style={styles.poweredByText}>Powered by DeroArts</Text>
      </Pressable>

      {/* ── Hamburger dropdown ───────────────────────────── */}
      {menuOpen && (
        <HamburgerDropdown
          lang={lang}
          onLangChange={setLang}
          onClose={() => setMenuOpen(false)}
          topOffset={topInset + HEADER_H + 8}
          englishEnabled={englishEnabled}
        />
      )}
    </View>
  );
}
