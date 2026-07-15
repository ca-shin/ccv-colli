import React from "react";
import { View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "@/constants/colors";

export const DRAG_ROW_H = 50;

export type MoveHandlers = {
  onUp: () => void;
  onDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

export function MoveButtons({ handlers }: { handlers: MoveHandlers }) {
  return (
    <View style={{ width: 32, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={handlers.onUp}
        disabled={handlers.isFirst}
        style={{ opacity: handlers.isFirst ? 0.2 : 1, paddingVertical: 1 }}
        hitSlop={6}
      >
        <Ionicons name="chevron-up" size={16} color={Colors.secondaryText} />
      </Pressable>
      <Pressable
        onPress={handlers.onDown}
        disabled={handlers.isLast}
        style={{ opacity: handlers.isLast ? 0.2 : 1, paddingVertical: 1 }}
        hitSlop={6}
      >
        <Ionicons name="chevron-down" size={16} color={Colors.secondaryText} />
      </Pressable>
    </View>
  );
}

export function DragList<T extends { id: string }>({
  items,
  renderItem,
  onReorder,
  rowHeight: _rowHeight,
}: {
  items: T[];
  renderItem: (item: T, handlers: MoveHandlers) => React.ReactNode;
  onReorder: (ids: string[]) => void;
  rowHeight?: number;
}) {
  const moveItem = (idx: number, dir: "up" | "down") => {
    const next = [...items];
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    onReorder(next.map((i) => i.id));
  };

  return (
    <View>
      {items.map((item, idx) => {
        const handlers: MoveHandlers = {
          onUp: () => moveItem(idx, "up"),
          onDown: () => moveItem(idx, "down"),
          isFirst: idx === 0,
          isLast: idx === items.length - 1,
        };
        return (
          <View key={item.id}>
            {renderItem(item, handlers)}
          </View>
        );
      })}
    </View>
  );
}
