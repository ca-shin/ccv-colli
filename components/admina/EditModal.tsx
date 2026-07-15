import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, Modal, ScrollView,
  Switch, ActivityIndicator, Alert, KeyboardAvoidingView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { formStyles } from "./adminStyles";
import type { EditTarget } from "./types";
import type { MenuSnapshot, Dish, Wine, Allergen } from "@/shared/schema";

function numToInput(val: number | null | undefined): string {
  if (val == null) return "";
  if (val % 1 === 0) return String(Math.round(val));
  return val.toFixed(1).replace(".", ",");
}

function sanitizePrice(text: string): string {
  let r = text.replace(".", ",").replace(/[^0-9,]/g, "");
  const parts = r.split(",");
  if (parts.length > 2) r = parts[0] + "," + parts.slice(1).join("");
  if (parts.length === 2 && parts[1].length > 1) r = parts[0] + "," + parts[1].slice(0, 1);
  return r;
}

function parsePrice(val: string): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(",", "."));
  return isNaN(n) ? null : n;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={formStyles.field}>
      <Text style={formStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, style, ...rest }: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad";
  style?: object;
  [key: string]: unknown;
}) {
  return (
    <TextInput
      style={[formStyles.input, multiline && formStyles.inputMulti, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.border}
      multiline={multiline}
      keyboardType={keyboardType}
      {...rest}
    />
  );
}

function normalizeAllergenName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isGlutenAllergen(allergen: Allergen): boolean {
  const name = `${normalizeAllergenName(allergen.name_it)} ${normalizeAllergenName(allergen.name_en)}`;
  return allergen.id === "gluten" || name.includes("glutine") || name.includes("gluten");
}

function AllergenPicker({ selected, allergens, disabledIds, onChange }: {
  selected: string[];
  allergens: Allergen[];
  disabledIds?: Set<string>;
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (disabledIds?.has(id)) return;
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  return (
    <View style={formStyles.allergenGrid}>
      {allergens.map((a) => {
        const active = selected.includes(a.id);
        const disabled = !!disabledIds?.has(a.id);
        return (
          <Pressable
            key={a.id}
            style={[
              formStyles.allergenChip,
              active && formStyles.allergenChipActive,
              disabled && formStyles.allergenChipDisabled,
            ]}
            onPress={() => toggle(a.id)}
            disabled={disabled}
          >
            <Text style={[
              formStyles.allergenChipText,
              active && formStyles.allergenChipTextActive,
              disabled && formStyles.allergenChipTextDisabled,
            ]}>
              {a.name_it}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EditModal({ target, data, onClose, onSaved }: {
  target: EditTarget;
  data: MenuSnapshot;
  onClose: () => void;
  onSaved: (newData: MenuSnapshot) => void;
}) {
  const isEdit = !!("item" in target && target.item);
  const item = "item" in target ? target.item : undefined;

  const [nameIt, setNameIt] = useState(item ? ("name_it" in item ? item.name_it : "") : "");
  const [nameEn, setNameEn] = useState(item ? ("name_en" in item ? item.name_en : "") : "");
  const [subtitleIt, setSubtitleIt] = useState<string>(item && "subtitle_it" in item ? (item as Dish).subtitle_it ?? "" : "");
  const [subtitleEn, setSubtitleEn] = useState<string>(item && "subtitle_en" in item ? (item as Dish).subtitle_en ?? "" : "");
  const [descIt, setDescIt] = useState<string>(item && "description_it" in item ? (item as Dish).description_it : "");
  const [descEn, setDescEn] = useState<string>(item && "description_en" in item ? (item as Dish).description_en : "");
  const [price, setPrice] = useState(item && "price" in item && item.price != null ? numToInput(item.price as number) : "");
  const [priceGlass, setPriceGlass] = useState(item && "price_glass" in item && (item as Wine).price_glass != null ? numToInput((item as Wine).price_glass) : "");
  const [priceBottle, setPriceBottle] = useState(item && "price_bottle" in item && (item as Wine).price_bottle != null ? numToInput((item as Wine).price_bottle) : "");
  const [vegetarian, setVegetarian] = useState(item && "vegetarian" in item ? !!(item as Dish).vegetarian : false);
  const [glutenFree, setGlutenFree] = useState(item && "gluten_free" in item ? !!(item as Dish).gluten_free : false);
  const [allergens, setAllergens] = useState<string[]>(item && "allergens" in item ? (item as Dish).allergens : []);
  const [extraInfo] = useState(item && "extra_info" in item ? (item as Dish).extra_info : "");
  const [producer, setProducer] = useState<string>(item && "producer" in item ? (item as Wine).producer : "");
  const [wineOrigin, setWineOrigin] = useState<string>(item && "origin" in item ? (item as Wine).origin : "");
  const [wineAbv, setWineAbv] = useState<string>(item && "abv" in item && (item as Wine).abv != null ? String((item as Wine).abv) : "");
  const [loading, setLoading] = useState(false);

  const isDish = target.type === "dish";
  const isWine = target.type === "wine";
  const isAllergen = target.type === "allergen";
  const glutenAllergenIds = useMemo(
    () => new Set(data.allergens.filter(isGlutenAllergen).map((allergen) => allergen.id)),
    [data.allergens]
  );
  const hasGlutenAllergen = allergens.some((id) => glutenAllergenIds.has(id));
  const disabledAllergenIds = glutenFree ? glutenAllergenIds : undefined;

  // Detect if this dish belongs to a Drink section (by sectionType or section name)
  const isDrink = target.type === "dish" && (
    (target as any).sectionType === "drink" ||
    ((target as any).sectionNameEn ?? "").toLowerCase().includes("drink") ||
    ((target as any).sectionType ?? "").toLowerCase().includes("drink")
  );

  const handleSave = async () => {
    if (!nameIt.trim()) return;
    setLoading(true);
    try {
      let endpoint = "";
      let method = "POST";
      let body: Record<string, unknown> = {};

      if (target.type === "section") {
        endpoint = isEdit ? `/api/admin/sections/${item!.id}` : "/api/admin/sections";
        method = isEdit ? "PUT" : "POST";
        body = {
          name_it: nameIt,
          name_en: nameEn,
        };
        if (isEdit && item && "type" in item && (item as any).type) {
          body.type = (item as any).type;
        }
      } else if (target.type === "category") {
        endpoint = isEdit ? `/api/admin/categories/${item!.id}` : "/api/admin/categories";
        method = isEdit ? "PUT" : "POST";
        body = { name_it: nameIt, name_en: nameEn, section_id: target.sectionId };
      } else if (target.type === "dish") {
        endpoint = isEdit ? `/api/admin/dishes/${item!.id}` : "/api/admin/dishes";
        method = isEdit ? "PUT" : "POST";
        body = {
          name_it: nameIt, name_en: nameEn,
          subtitle_it: subtitleIt, subtitle_en: subtitleEn,
          description_it: descIt, description_en: descEn,
          price: parsePrice(price),
          vegetarian,
          gluten_free: glutenFree && !hasGlutenAllergen,
          allergens,
          extra_info: extraInfo,
          category_id: (target as { type: "dish"; categoryId: string }).categoryId,
        };
      } else if (target.type === "wine_category") {
        endpoint = isEdit ? `/api/admin/wine-categories/${item!.id}` : "/api/admin/wine-categories";
        method = isEdit ? "PUT" : "POST";
        body = { name_it: nameIt, name_en: nameEn };
      } else if (target.type === "wine") {
        endpoint = isEdit ? `/api/admin/wines/${item!.id}` : "/api/admin/wines";
        method = isEdit ? "PUT" : "POST";
        body = {
          name_it: nameIt.trim(), name_en: nameIt.trim(),
          producer: producer.trim(), origin: wineOrigin.trim(),
          abv: wineAbv ? parseFloat(wineAbv) : null,
          price_glass: parsePrice(priceGlass),
          price_bottle: parsePrice(priceBottle),
          wine_category_id: (target as { type: "wine"; wineCategoryId: string }).wineCategoryId,
        };
      } else if (target.type === "allergen") {
        endpoint = isEdit ? `/api/admin/allergens/${item!.id}` : "/api/admin/allergens";
        method = isEdit ? "PUT" : "POST";
        body = { name_it: nameIt, name_en: nameEn || nameIt };
      }

      const res = await apiRequest(method, endpoint, body);
      const newData: MenuSnapshot = await res.json();
      onSaved(newData);
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert("Errore", `Impossibile salvare: ${err.message || "Riprova"}`);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const action = isEdit ? "Modifica" : "Aggiungi";
    if (target.type === "section") return `${action} Sezione`;
    if (target.type === "category") return `${action} Categoria`;
    if (target.type === "dish") return isDrink ? `${action} Drink` : `${action} Piatto`;
    if (target.type === "wine_category") return `${action} Categoria Vino`;
    if (target.type === "wine") return `${action} Vino`;
    if (target.type === "allergen") return `${action} Allergene`;
    return action;
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={formStyles.container}>
          <View style={formStyles.headerRow}>
            <Text style={formStyles.title}>{getTitle()}</Text>
            <Pressable onPress={onClose} style={formStyles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.warmBrown} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={formStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isWine ? (
              <FormField label="Nome">
                <StyledInput value={nameIt} onChangeText={setNameIt} placeholder="Nome del vino" />
              </FormField>
            ) : (
              <FormField label="Nome italiano">
                <StyledInput value={nameIt} onChangeText={setNameIt} placeholder="Nome in italiano" />
              </FormField>
            )}

            {!isWine && !isAllergen && (
              <FormField label="Nome inglese">
                <StyledInput value={nameEn} onChangeText={setNameEn} placeholder="Name in English" />
              </FormField>
            )}

            {isWine && (
              <>
                <FormField label="Produttore">
                  <StyledInput value={producer} onChangeText={setProducer} placeholder="es. Moët & Chandon, Antinori" />
                </FormField>
                <FormField label="Provenienza">
                  <StyledInput value={wineOrigin} onChangeText={setWineOrigin} placeholder="es. Veneto, Toscana, Francia" />
                </FormField>
                <FormField label="Gradazione (%)">
                  <StyledInput value={wineAbv} onChangeText={setWineAbv} placeholder="es. 12.5" keyboardType="decimal-pad" />
                </FormField>
                <FormField label="Prezzo al calice (€)">
                  <StyledInput value={priceGlass} onChangeText={(t) => setPriceGlass(sanitizePrice(t))} placeholder="es. 6,5" keyboardType="decimal-pad" />
                </FormField>
                <FormField label="Prezzo bottiglia (€)">
                  <StyledInput value={priceBottle} onChangeText={(t) => setPriceBottle(sanitizePrice(t))} placeholder="es. 24" keyboardType="decimal-pad" />
                </FormField>
              </>
            )}

            {isDish && (
              <>
                <FormField label="Sottotitolo italiano">
                  <StyledInput value={subtitleIt} onChangeText={setSubtitleIt} placeholder="Es. Con lime e menta fresca..." />
                </FormField>
                <FormField label="Subtitle English">
                  <StyledInput value={subtitleEn} onChangeText={setSubtitleEn} placeholder="E.g. With lime and fresh mint..." />
                </FormField>
                <FormField label="Descrizione italiano">
                  <StyledInput value={descIt} onChangeText={setDescIt} placeholder="Descrizione del piatto..." multiline />
                </FormField>
                <FormField label="Description English">
                  <StyledInput value={descEn} onChangeText={setDescEn} placeholder="Dish description..." multiline />
                </FormField>
                <FormField label="Prezzo (€)">
                  <StyledInput value={price} onChangeText={(t) => setPrice(sanitizePrice(t))} placeholder="es. 13,5" keyboardType="decimal-pad" />
                </FormField>
                {!isDrink && (
                  <FormField label="Vegetariano">
                    <View style={formStyles.switchRow}>
                      <Switch
                        value={vegetarian}
                        onValueChange={setVegetarian}
                        trackColor={{ false: Colors.border, true: Colors.green }}
                        thumbColor="#fff"
                      />
                      <Text style={formStyles.switchLabel}>{vegetarian ? "Sì" : "No"}</Text>
                    </View>
                  </FormField>
                )}
                {!isDrink && (
                  <FormField label="Senza glutine">
                    <View style={formStyles.switchRow}>
                      <Switch
                        value={glutenFree && !hasGlutenAllergen}
                        onValueChange={setGlutenFree}
                        disabled={hasGlutenAllergen}
                        trackColor={{ false: Colors.border, true: Colors.warmBrown }}
                        thumbColor="#fff"
                      />
                      <Text style={[formStyles.switchLabel, hasGlutenAllergen && formStyles.switchLabelDisabled]}>
                        {glutenFree && !hasGlutenAllergen ? "Sì" : "No"}
                      </Text>
                    </View>
                  </FormField>
                )}
                {!isDrink && (
                  <FormField label="Allergeni">
                    <AllergenPicker
                      selected={allergens}
                      allergens={data.allergens}
                      disabledIds={disabledAllergenIds}
                      onChange={setAllergens}
                    />
                  </FormField>
                )}
              </>
            )}

            {isAllergen && (
              <FormField label="Nome inglese">
                <StyledInput value={nameEn} onChangeText={setNameEn} placeholder="Name in English" />
              </FormField>
            )}
          </ScrollView>

          <View style={formStyles.footer}>
            <Pressable style={formStyles.cancelBtn} onPress={onClose}>
              <Text style={formStyles.cancelText}>Annulla</Text>
            </Pressable>
            <Pressable
              style={[formStyles.saveBtn, loading && formStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={formStyles.saveText}>Salva</Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
