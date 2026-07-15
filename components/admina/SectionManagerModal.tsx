import React, { useState } from "react";
import {
  View, Text, Pressable, Modal, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import type { MenuSnapshot } from "@/shared/schema";

interface Props {
  visible: boolean;
  data: MenuSnapshot;
  onClose: () => void;
  onUpdated: (newData: MenuSnapshot) => void;
}

export function SectionManagerModal({ visible, data, onClose, onUpdated }: Props) {
  const sorted = [...data.sections].sort((a, b) => a.order - b.order);

  const [nameIt, setNameIt] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const resetForm = () => { setNameIt(""); setNameEn(""); };

  const fetchMenuSnapshot = async (): Promise<MenuSnapshot> => {
    const url = new URL("/api/menu/draft", getApiUrl()).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch menu: ${res.status}`);
    return res.json();
  };

  const move = async (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    if (movingId !== null) return;

    const ids = sorted.map((s) => s.id);
    const [movedId] = ids.splice(index, 1);
    ids.splice(swapIndex, 0, movedId);

    setMovingId(sorted[index].id);
    try {
      const res = await apiRequest("PUT", "/api/admin/sections/reorder", { ids });
      const newData: MenuSnapshot = await res.json();
      onUpdated(newData);
    } catch (e) {
      console.error("Reorder failed:", e);
    } finally {
      setMovingId(null);
    }
  };

  const handleAdd = async () => {
    if (!nameIt.trim() || adding) return;
    setAdding(true);
    try {
      await apiRequest("POST", "/api/admin/sections", {
        name_it: nameIt.trim(),
        name_en: nameEn.trim() || nameIt.trim(),
      });
      const newData = await fetchMenuSnapshot();
      onUpdated(newData);
      resetForm();
    } catch (e) {
      console.error("Add section failed:", e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Gestisci Sezioni</Text>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.warmBrown} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {sorted.length === 0 && (
              <Text style={s.emptyText}>Nessuna sezione presente</Text>
            )}

            {sorted.map((sec, index) => {
              const isFirst = index === 0;
              const isLast = index === sorted.length - 1;
              const isMoving = movingId === sec.id;
              const anyMoving = movingId !== null;

              return (
                <View key={sec.id} style={s.card}>
                  <Text style={s.cardIndex}>{index + 1}</Text>
                  <Text style={s.cardName} numberOfLines={1}>{sec.name_it}</Text>
                  <View style={s.arrows}>
                    <Pressable
                      style={[s.arrowBtn, (isFirst || anyMoving) && s.arrowDisabled]}
                      onPress={() => move(index, "up")}
                      disabled={isFirst || anyMoving}
                    >
                      {isMoving ? (
                        <ActivityIndicator size="small" color={Colors.maroon} />
                      ) : (
                        <Ionicons name="chevron-up" size={20} color={isFirst ? Colors.border : Colors.maroon} />
                      )}
                    </Pressable>
                    <Pressable
                      style={[s.arrowBtn, (isLast || anyMoving) && s.arrowDisabled]}
                      onPress={() => move(index, "down")}
                      disabled={isLast || anyMoving}
                    >
                      {isMoving ? (
                        <ActivityIndicator size="small" color={Colors.maroon} />
                      ) : (
                        <Ionicons name="chevron-down" size={20} color={isLast ? Colors.border : Colors.maroon} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <View style={s.divider} />

            <Text style={s.addTitle}>Aggiungi nuova sezione</Text>

            <Text style={s.fieldLabel}>NOME ITALIANO</Text>
            <TextInput
              style={s.input}
              value={nameIt}
              onChangeText={setNameIt}
              placeholder="Nome in italiano"
              placeholderTextColor={Colors.border}
            />

            <Text style={s.fieldLabel}>NOME INGLESE</Text>
            <TextInput
              style={s.input}
              value={nameEn}
              onChangeText={setNameEn}
              placeholder="Name in English"
              placeholderTextColor={Colors.border}
            />

            <Pressable
              style={[s.addBtn, (!nameIt.trim() || adding) && s.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!nameIt.trim() || adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.addBtnText}>Aggiungi sezione</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  title: { fontSize: 18, fontFamily: "PlayfairDisplay_400Regular", color: Colors.darkOrange },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.beige,
    alignItems: "center", justifyContent: "center",
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyText: {
    fontSize: 14, fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText, textAlign: "center", marginVertical: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingLeft: 12,
    paddingRight: 4,
    marginBottom: 8,
    height: 48,
  },
  cardIndex: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.beige,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    overflow: "hidden",
    marginRight: 10,
  },
  cardName: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    letterSpacing: 0.4,
    flex: 1,
  },
  arrows: { flexDirection: "row", alignItems: "center" },
  arrowBtn: {
    width: 36, height: 48,
    alignItems: "center", justifyContent: "center",
  },
  arrowDisabled: { opacity: 0.25 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
  addTitle: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    backgroundColor: Colors.card,
    marginBottom: 14,
  },
  addBtn: {
    backgroundColor: Colors.maroon,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 15, fontFamily: "Montserrat_400Regular", color: "#fff" },
});
