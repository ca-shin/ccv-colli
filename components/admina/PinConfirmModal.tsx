import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

export function PinConfirmModal({ message, requirePin = true, onConfirm, onCancel }: {
  message: string;
  requirePin?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!requirePin) {
      onConfirm();
      return;
    }

    if (!pin.trim()) {
      setError(true);
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/admin/password/verify", { password: pin });
      onConfirm();
    } catch {
      setError(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onCancel}>
      <View style={pinStyles.overlay}>
        <View style={pinStyles.box}>
          <Text style={pinStyles.title}>Conferma eliminazione</Text>
          <Text style={pinStyles.message}>{message}</Text>
          {requirePin && (
            <>
              <TextInput
                style={[pinStyles.input, error && pinStyles.inputError]}
                value={pin}
                onChangeText={(t) => { setPin(t); setError(false); }}
                placeholder="PIN admin"
                placeholderTextColor={Colors.border}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={12}
                autoFocus
              />
              {error && <Text style={pinStyles.errorText}>PIN non corretto</Text>}
            </>
          )}
          <View style={pinStyles.buttons}>
            <Pressable style={pinStyles.cancelBtn} onPress={onCancel}>
              <Text style={pinStyles.cancelText}>Annulla</Text>
            </Pressable>
            <Pressable style={pinStyles.confirmBtn} onPress={handleConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={pinStyles.confirmText}>Elimina</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const pinStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  title: {
    fontSize: 18,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    backgroundColor: "#fff",
    marginBottom: 4,
  },
  inputError: {
    borderColor: "#C0392B",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#C0392B",
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#C0392B",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#fff",
  },
});
