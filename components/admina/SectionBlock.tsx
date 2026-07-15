import React from "react";
import { Image, View, Text, Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@/constants/colors";
import { panelStyles } from "./adminStyles";
import { DragList, MoveButtons, MoveHandlers, DRAG_ROW_H } from "./DragList";
import type { EditTarget } from "./types";
import type { MenuSnapshot, Section, Category } from "@/shared/schema";

const glutenFreeIconSource = require("@/assets/images/icons8-senza-glutine-100.png");

function CatBlock({
  cat,
  sectionId,
  sectionType,
  sectionNameEn,
  data,
  doReorder,
  confirmDelete,
  setEditTarget,
  dragHandlers,
}: {
  cat: Category;
  sectionId: string;
  sectionType?: string | null;
  sectionNameEn?: string;
  data: MenuSnapshot;
  doReorder: (endpoint: string, ids: string[]) => Promise<void>;
  confirmDelete: (label: string, endpoint: string, options?: { requirePin?: boolean }) => void;
  setEditTarget: (t: EditTarget) => void;
  dragHandlers: MoveHandlers;
}) {
  const dishes = data.dishes
    .filter((d) => d.category_id === cat.id)
    .sort((a, b) => a.order - b.order);

  return (
    <View style={panelStyles.sectionBlock}>
      <View style={panelStyles.catRow}>
        <MoveButtons handlers={dragHandlers} />
        <View style={panelStyles.catInfo}>
          <Text style={panelStyles.catName}>{cat.name_it}</Text>
        </View>
        <View style={panelStyles.actions}>
          <Pressable
            style={panelStyles.actionBtn}
            onPress={() => setEditTarget({ type: "category", sectionId, item: cat })}
          >
            <Feather name="edit-3" size={15} color={Colors.green} />
          </Pressable>
          <Pressable
            style={panelStyles.actionBtn}
            onPress={() => confirmDelete(cat.name_it, `/api/admin/categories/${cat.id}`)}
          >
            <Feather name="trash-2" size={15} color="#C0392B" />
          </Pressable>
        </View>
      </View>

      <DragList
        items={dishes}
        onReorder={(ids) => doReorder("/api/admin/dishes/reorder", ids)}
        rowHeight={DRAG_ROW_H}
        renderItem={(dish, dishHandlers) => (
          <View style={panelStyles.dishRow}>
            <MoveButtons handlers={dishHandlers} />
            <View style={panelStyles.dishInfo}>
              <View style={panelStyles.dishNameRow}>
                {dish.vegetarian && <Ionicons name="leaf" size={11} color={Colors.leafGreen} />}
                {dish.gluten_free && <Image source={glutenFreeIconSource} style={panelStyles.dishGlutenFreeIcon} />}
                <Text style={panelStyles.dishName} numberOfLines={1}>{dish.name_it}</Text>
              </View>
              {dish.subtitle_it && (
                <Text style={panelStyles.dishSubtitle} numberOfLines={1}>{dish.subtitle_it}</Text>
              )}
              {dish.price != null && (
                <Text style={panelStyles.dishPrice}>€ {dish.price % 1 === 0 ? Math.round(dish.price) : dish.price.toFixed(1).replace(".", ",")}</Text>
              )}
            </View>
            <View style={panelStyles.actions}>
              <Pressable
                style={panelStyles.actionBtn}
                onPress={() => setEditTarget({ type: "dish", categoryId: cat.id, item: dish, sectionType, sectionNameEn })}
              >
                <Feather name="edit-3" size={15} color={Colors.green} />
              </Pressable>
              <Pressable
                style={panelStyles.actionBtn}
                onPress={() => confirmDelete(dish.name_it, `/api/admin/dishes/${dish.id}`, { requirePin: false })}
              >
                <Feather name="trash-2" size={15} color="#C0392B" />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Aggiungi voce */}
      <Pressable
        style={panelStyles.addDishBtn}
        onPress={() => setEditTarget({ type: "dish", categoryId: cat.id, sectionType, sectionNameEn })}
      >
        <Ionicons name="add-circle-outline" size={15} color={Colors.green} />
        <Text style={panelStyles.addDishText}>Aggiungi voce</Text>
      </Pressable>
    </View>
  );
}

export function SectionBlock({
  section,
  data,
  doReorder,
  confirmDelete,
  setEditTarget,
}: {
  section: Section;
  data: MenuSnapshot;
  doReorder: (endpoint: string, ids: string[]) => Promise<void>;
  confirmDelete: (label: string, endpoint: string, options?: { requirePin?: boolean }) => void;
  setEditTarget: (t: EditTarget) => void;
}) {
  const cats = data.categories
    .filter((c) => c.section_id === section.id)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <DragList
        items={cats}
        onReorder={(ids) => doReorder("/api/admin/categories/reorder", ids)}
        rowHeight={DRAG_ROW_H}
        renderItem={(cat, catHandlers) => (
          <CatBlock
            cat={cat}
            sectionId={section.id}
            sectionType={section.type}
            sectionNameEn={section.name_en}
            data={data}
            doReorder={doReorder}
            confirmDelete={confirmDelete}
            setEditTarget={setEditTarget}
            dragHandlers={catHandlers}
          />
        )}
      />

      {/* Aggiungi categoria */}
      <Pressable
        style={panelStyles.addCatBtn}
        onPress={() => setEditTarget({ type: "category", sectionId: section.id })}
      >
        <Ionicons name="add-circle-outline" size={15} color={Colors.secondaryText} />
        <Text style={panelStyles.addCatText}>Aggiungi categoria</Text>
      </Pressable>
    </>
  );
}
