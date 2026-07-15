import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

const PIN_PATTERN = /^\d{4,12}$/;

export function ChangePinModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    onClose();
  };

  const handleSave = async () => {
    setError("");

    if (!PIN_PATTERN.test(newPin)) {
      setError("Il nuovo PIN deve contenere da 4 a 12 cifre.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("I due nuovi PIN non coincidono.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("PUT", "/api/admin/password", {
        currentPassword: currentPin,
        newPassword: newPin,
      });
      resetAndClose();
      Alert.alert("PIN aggiornato", "Il nuovo PIN admin è attivo.");
    } catch {
      setError("PIN attuale non corretto o aggiornamento non riuscito.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Modifica PIN admin</Text>
          <Text style={styles.message}>Imposta un nuovo PIN numerico per accesso admin e conferme protette.</Text>

          <TextInput
            style={styles.input}
            value={currentPin}
            onChangeText={(t) => { setCurrentPin(t); setError(""); }}
            placeholder="PIN attuale"
            placeholderTextColor={Colors.border}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={12}
            autoFocus
          />
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={(t) => { setNewPin(t); setError(""); }}
            placeholder="Nuovo PIN"
            placeholderTextColor={Colors.border}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={12}
          />
          <TextInput
            style={styles.input}
            value={confirmPin}
            onChangeText={(t) => { setConfirmPin(t); setError(""); }}
            placeholder="Conferma nuovo PIN"
            placeholderTextColor={Colors.border}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={12}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Pressable style={styles.cancelBtn} onPress={resetAndClose} disabled={loading}>
              <Text style={styles.cancelText}>Annulla</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Salva</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 18,
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
    marginBottom: 10,
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
    marginTop: 8,
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
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.maroon,
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#fff",
  },
});
