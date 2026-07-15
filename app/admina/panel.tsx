import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Platform, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { apiRequest } from "@/lib/query-client";
import { Colors } from "@/constants/colors";
import { panelStyles } from "@/components/admina/adminStyles";
import { DragList, MoveButtons, DRAG_ROW_H } from "@/components/admina/DragList";
import { SectionBlock } from "@/components/admina/SectionBlock";
import { EditModal } from "@/components/admina/EditModal";
import { SectionManagerModal } from "@/components/admina/SectionManagerModal";
import { PinConfirmModal } from "@/components/admina/PinConfirmModal";
import { ChangePinModal } from "@/components/admina/ChangePinModal";
import type { EditTarget } from "@/components/admina/types";
import type { MenuSnapshot, Section } from "@/shared/schema";

// ── Panel Screen ─────────────────────────────────────────────────────────────

export default function AdminaPanelScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [localData, setLocalData] = useState<MenuSnapshot | null>(null);
  const [pinConfirm, setPinConfirm] = useState<{
    message: string;
    requirePin: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [englishEnabled, setEnglishEnabled] = useState(false);

  const topInset = (insets.top > 0 ? insets.top : 20) + (Platform.OS === "web" ? 20 : 0);
  const bottomInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const { data: fetchedData, isLoading } = useQuery<MenuSnapshot>({
    queryKey: ["/api/menu/draft"],
    staleTime: 0,
  });

  const data: MenuSnapshot | undefined = localData || fetchedData;

  // Load English enabled state from AsyncStorage
  useEffect(() => {
    const loadEnglishState = async () => {
      try {
        const stored = await AsyncStorage.getItem("englishEnabled");
        if (stored !== null) {
          setEnglishEnabled(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Error loading English state:", e);
      }
    };
    loadEnglishState();
  }, []);

  // Save English enabled state to AsyncStorage
  const handleEnglishToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem("englishEnabled", JSON.stringify(value));
      setEnglishEnabled(value);
    } catch (e) {
      console.error("Error saving English state:", e);
    }
  };

  // Set default tab once data arrives
  React.useEffect(() => {
    if (data && tab === null) {
      const sorted = [...data.sections].sort((a, b) => a.order - b.order);
      if (sorted.length > 0) setTab(sorted[0].id);
      else setTab("vini");
    }
  }, [data, tab]);

  const updateLocal = (newData: MenuSnapshot) => {
    setLocalData(newData);
    qc.setQueryData(["/api/menu/draft"], newData);
  };

  const doReorder = useCallback(async (endpoint: string, ids: string[]) => {
    try {
      const res = await apiRequest("PUT", endpoint, { ids });
      const d: MenuSnapshot = await res.json();
      updateLocal(d);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDelete = async (endpoint: string) => {
    try {
      const res = await apiRequest("DELETE", endpoint, undefined);
      const d: MenuSnapshot = await res.json();
      updateLocal(d);
    } catch {
      Alert.alert("Errore", "Impossibile eliminare l'elemento.");
    }
  };

  const confirmDelete = (
    label: string,
    endpoint: string,
    options: { requirePin?: boolean } = {},
  ) => {
    const requirePin = options.requirePin ?? true;
    setPinConfirm({
      message: requirePin
        ? `Stai per eliminare "${label}". Questa azione è irreversibile.\n\nInserisci il PIN admin per confermare.`
        : `Stai per eliminare "${label}". Questa azione è irreversibile.`,
      requirePin,
      onConfirm: async () => {
        setPinConfirm(null);
        await doDelete(endpoint);
      },
    });
  };

  const confirmDeleteSection = (section: Section) => {
    if (section.type === "wine") {
      Alert.alert("Info", "La sezione Vini non può essere eliminata.\nPuoi spostarla o rinominarla.");
      return;
    }
    setPinConfirm({
      message: `Stai per eliminare la sezione principale "${section.name_it}" con tutte le sue categorie e piatti. Questa azione è irreversibile.\n\nInserisci il PIN admin per confermare.`,
      requirePin: true,
      onConfirm: async () => {
        setPinConfirm(null);
        // After deletion, switch tab to first remaining section
        const newTab = data?.sections
          .filter((s) => s.id !== section.id)
          .sort((a, b) => a.order - b.order)[0]?.id ?? "vini";
        await doDelete(`/api/admin/sections/${section.id}`);
        setTab(newTab);
      },
    });
  };

  if (isLoading || !data) {
    return (
      <View style={[panelStyles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.maroon} />
      </View>
    );
  }

  const sortedSections = [...data.sections].sort((a, b) => a.order - b.order);
  const sortedWineCats = [...data.wineCategories].sort((a, b) => a.order - b.order);
  const viniCat = data.wineCategories.find((wc) => wc.name_it.toUpperCase() === "VINI");

  // Build tab list: dynamic sections (Vini incluso se in DB con type="wine")
  // Fallback: aggiunge tab "vini" hardcoded solo se non c'è una sezione wine nel DB
  const wineSection = sortedSections.find((s) => s.type === "wine");
  const TABS: { id: string; label: string }[] = [
    ...sortedSections.map((s) => ({ id: s.id, label: s.name_it })),
    ...(wineSection ? [] : [{ id: "vini", label: "Vini" }]),
  ];

  const activeTab = tab ?? TABS[0]?.id ?? "vini";
  const activeSection = sortedSections.find((s) => s.id === activeTab);
  const isWineTab = activeTab === "vini" || activeSection?.type === "wine";

  return (
    <View style={panelStyles.container}>
      {pinConfirm && (
        <PinConfirmModal
          message={pinConfirm.message}
          requirePin={pinConfirm.requirePin}
          onConfirm={pinConfirm.onConfirm}
          onCancel={() => setPinConfirm(null)}
        />
      )}

      <ChangePinModal
        visible={changePinOpen}
        onClose={() => setChangePinOpen(false)}
      />

      {/* ── Header ── */}
      <View style={[panelStyles.header, { paddingTop: topInset }]}>
        {/* Riga 1: home + toggle EN + A */}
        <View style={panelStyles.headerRow}>
          <View style={panelStyles.headerLeftActions}>
            <Pressable style={panelStyles.backBtn} onPress={() => router.replace("/")}>
              <Ionicons name="home-outline" size={20} color="#BDB2A7" />
            </Pressable>
            <Pressable style={panelStyles.backBtn} onPress={() => setChangePinOpen(true)}>
              <Ionicons name="key-outline" size={19} color="#BDB2A7" />
            </Pressable>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 11, color: "#BDB2A7", fontWeight: "500" }}>EN</Text>
            <Switch
              value={englishEnabled}
              onValueChange={handleEnglishToggle}
              trackColor={{ false: "#E2D9CF", true: "#5B7A4E" }}
              thumbColor="#FFF"
              style={{ transform: [{ scale: 0.75 }] }}
            />
          </View>
          <Pressable style={panelStyles.adminCircleBtn} onPress={() => {
            if (activeTab === "allergeni") {
              setTab(TABS[0]?.id ?? "vini");
            } else {
              setTab("allergeni");
            }
          }}>
            <Text style={[panelStyles.adminCircleText, { color: "#BDB2A7" }]}>A</Text>
          </Pressable>
        </View>

        {/* Separatore */}
        <View style={panelStyles.headerDivider} />

        {/* Riga 2: tabs */}
        <View style={panelStyles.tabsRow}>
          <Pressable
            style={panelStyles.addSectionTabBtn}
            onPress={() => setSectionManagerOpen(true)}
          >
            <Ionicons name="add" size={18} color={Colors.maroon} />
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={panelStyles.tabsScroll}
            contentContainerStyle={panelStyles.tabsContent}
          >
            {TABS.map((t) => (
              <Pressable
                key={t.id}
                style={[panelStyles.tabBtn, activeTab === t.id && panelStyles.tabBtnActive]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[panelStyles.tabText, activeTab === t.id && panelStyles.tabTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={panelStyles.scroll}
        contentContainerStyle={[panelStyles.scrollContent, { paddingBottom: bottomInset + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* SEZIONI DINAMICHE (escluse wine) */}
        {activeSection && activeSection.type !== "wine" && (
          <>
            {/* Section header dark card */}
            <View style={panelStyles.mainSectionCard}>
              <View style={panelStyles.mainSectionRow}>
                <View style={panelStyles.mainSectionInfo}>
                  <Text style={panelStyles.mainSectionName}>{activeSection.name_it}</Text>
                  {activeSection.subtitle_it ? (
                    <Text style={panelStyles.mainSectionSubtitle}>{activeSection.subtitle_it}</Text>
                  ) : null}
                </View>
                <Pressable
                  style={panelStyles.mainSectionBtn}
                  onPress={() => setEditTarget({ type: "section", item: activeSection })}
                >
                  <Feather name="edit-3" size={16} color="#F5EFE7" />
                </Pressable>
                <Pressable
                  style={panelStyles.mainSectionBtn}
                  onPress={() => confirmDeleteSection(activeSection)}
                >
                  <Feather name="trash-2" size={16} color="#E88A8A" />
                </Pressable>
              </View>
            </View>

            {/* Categories of this section */}
            <SectionBlock
              section={activeSection}
              data={data}
              doReorder={doReorder}
              confirmDelete={confirmDelete}
              setEditTarget={setEditTarget}
            />
          </>
        )}

        {/* VINI TAB */}
        {isWineTab && (
          <>
            {/* Wine section header dark card */}
            <View style={panelStyles.mainSectionCard}>
              <View style={panelStyles.mainSectionRow}>
                <View style={panelStyles.mainSectionInfo}>
                  <Text style={panelStyles.mainSectionName}>{activeSection?.name_it ?? "Vini"}</Text>
                </View>
                {viniCat && (
                  <>
                    <Pressable
                      style={panelStyles.mainSectionBtn}
                      onPress={() => setEditTarget({ type: "wine_category", item: viniCat })}
                    >
                      <Feather name="edit-3" size={16} color="#F5EFE7" />
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            <DragList
              items={sortedWineCats}
              onReorder={(ids) => doReorder("/api/admin/wine-categories/reorder", ids)}
              rowHeight={DRAG_ROW_H}
              renderItem={(wcat, wcatDrag) => {
                const wines = data.wines
                  .filter((w) => w.wine_category_id === wcat.id)
                  .sort((a, b) => a.order - b.order);

                // Filtra la categoria "VINI" se è quella in fondo
                if (wcat.name_it.toUpperCase() === "VINI") return null;

                return (
                  <View style={panelStyles.sectionBlock} key={wcat.id}>
                    <View style={panelStyles.sectionRow}>
                      <MoveButtons handlers={wcatDrag} />
                      <View style={panelStyles.sectionInfo}>
                        <Text style={panelStyles.sectionName}>{wcat.name_it}</Text>
                      </View>
                  <View style={panelStyles.actions}>
                    <Pressable
                      style={panelStyles.actionBtn}
                      onPress={() => setEditTarget({ type: "wine_category", item: wcat })}
                    >
                      <Feather name="edit-3" size={16} color={Colors.green} />
                    </Pressable>
                    <Pressable
                      style={panelStyles.actionBtn}
                      onPress={() => confirmDelete(wcat.name_it, `/api/admin/wine-categories/${wcat.id}`)}
                    >
                      <Feather name="trash-2" size={16} color="#C0392B" />
                    </Pressable>
                  </View>
                    </View>

                    <DragList
                      items={wines}
                      onReorder={(ids) => doReorder("/api/admin/wines/reorder", ids)}
                      rowHeight={DRAG_ROW_H}
                      renderItem={(wine, wineDrag) => (
                        <View style={panelStyles.dishRow}>
                          <MoveButtons handlers={wineDrag} />
                          <View style={panelStyles.dishInfo}>
                            <Text style={panelStyles.dishName} numberOfLines={1}>{wine.name_it}</Text>
                            <View style={panelStyles.winePriceRow}>
                              {wine.price_glass != null && (
                                <Text style={panelStyles.dishPrice}>€ {wine.price_glass % 1 === 0 ? Math.round(wine.price_glass) : wine.price_glass.toFixed(1).replace(".", ",")}</Text>
                              )}
                              {wine.price_bottle != null && (
                                <Text style={panelStyles.dishPrice}>€ {wine.price_bottle % 1 === 0 ? Math.round(wine.price_bottle) : wine.price_bottle.toFixed(1).replace(".", ",")}</Text>
                              )}
                            </View>
                          </View>
                          <View style={panelStyles.actions}>
                            <Pressable
                              style={panelStyles.actionBtn}
                              onPress={() => setEditTarget({ type: "wine", wineCategoryId: wcat.id, item: wine })}
                            >
                              <Feather name="edit-3" size={15} color={Colors.green} />
                            </Pressable>
                            <Pressable
                              style={panelStyles.actionBtn}
                              onPress={() => confirmDelete(wine.name_it, `/api/admin/wines/${wine.id}`)}
                            >
                              <Feather name="trash-2" size={15} color="#C0392B" />
                            </Pressable>
                          </View>
                        </View>
                      )}
                    />

                    {/* Aggiungi vino */}
                    <Pressable
                      style={panelStyles.addDishBtn}
                      onPress={() => setEditTarget({ type: "wine", wineCategoryId: wcat.id })}
                    >
                      <Ionicons name="add-circle-outline" size={15} color={Colors.green} />
                      <Text style={panelStyles.addDishText}>Aggiungi vino</Text>
                    </Pressable>
                  </View>
                );
              }}
            />

            {/* Aggiungi categoria vino */}
            <Pressable
              style={panelStyles.addCatBtn}
              onPress={() => setEditTarget({ type: "wine_category" })}
            >
              <Ionicons name="add-circle-outline" size={15} color={Colors.secondaryText} />
              <Text style={panelStyles.addCatText}>Aggiungi categoria vino</Text>
            </Pressable>

          </>
        )}

        {/* ALLERGENI TAB */}
        {activeTab === "allergeni" && (
          <>
            <View style={panelStyles.allergenInfoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.secondaryText} />
              <Text style={panelStyles.allergenInfoText}>
                14 allergeni EU precaricati. Puoi aggiungere, modificare o eliminare allergeni dalla lista.
              </Text>
            </View>

            {data.allergens.map((allergen) => (
              <View key={allergen.id} style={panelStyles.allergenRow}>
                <View style={panelStyles.allergenInfo}>
                  <Text style={panelStyles.allergenName}>{allergen.name_it}</Text>
                </View>
                <View style={panelStyles.actions}>
                  <Pressable
                    style={panelStyles.actionBtn}
                    onPress={() => setEditTarget({ type: "allergen", item: allergen })}
                  >
                    <Feather name="edit-3" size={15} color={Colors.green} />
                  </Pressable>
                  <Pressable
                    style={panelStyles.actionBtn}
                    onPress={() => confirmDelete(allergen.name_it, `/api/admin/allergens/${allergen.id}`)}
                  >
                    <Feather name="trash-2" size={15} color="#C0392B" />
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable
              style={panelStyles.addSectionBtn}
              onPress={() => setEditTarget({ type: "allergen" })}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.green} />
              <Text style={panelStyles.addSectionText}>Aggiungi allergene</Text>
            </Pressable>
          </>
        )}

      </ScrollView>

      {editTarget && (
        <EditModal
          target={editTarget}
          data={data}
          onClose={() => setEditTarget(null)}
          onSaved={(newData) => {
            updateLocal(newData);
            // If we added a new section, switch to it
            if (editTarget.type === "section" && !editTarget.item) {
              const prevIds = data.sections.map((s) => s.id);
              const newSec = newData.sections.find((s) => !prevIds.includes(s.id));
              if (newSec) setTab(newSec.id);
            }
            setEditTarget(null);
          }}
        />
      )}

      <SectionManagerModal
        visible={sectionManagerOpen}
        data={data}
        onClose={() => setSectionManagerOpen(false)}
        onUpdated={(newData) => {
          updateLocal(newData);
          // If a new section was added, switch to it
          const prevIds = data.sections.map((s) => s.id);
          const newSec = newData.sections.find((s) => !prevIds.includes(s.id));
          if (newSec) setTab(newSec.id);
        }}
      />
    </View>
  );
}
