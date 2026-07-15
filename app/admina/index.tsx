import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "@/lib/query-client";
import { Colors } from "@/constants/colors";

export default function AdminaLoginScreen() {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [secure, setSecure] = useState(true);

  const topInset = insets.top + 67;
  const bottomInset = insets.bottom;

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/admin/login", { password });
      const data = await res.json();
      if (data.success) {
        router.replace("/admina/panel");
      } else {
        setError("Password non corretta");
      }
    } catch {
      setError("Password non corretta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
    >
      <View style={[styles.inner, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/")}>
          <Ionicons name="arrow-back" size={20} color={Colors.warmBrown} />
        </Pressable>

        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Pannello Admin</Text>
          <Text style={styles.subtitle}>Inserisci la password per accedere</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              placeholder="Password"
              placeholderTextColor={Colors.border}
              secureTextEntry={secure}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setSecure(!secure)}>
              <Ionicons
                name={secure ? "eye-outline" : "eye-off-outline"}
                size={20}
                color={Colors.secondaryText}
              />
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Accedi</Text>
            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 70,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    boxShadow: "0px 2px 12px rgba(114,47,55,0.06)",
  },
  title: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.cream,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#C0392B",
    marginBottom: 12,
  },
  loginBtn: {
    backgroundColor: Colors.maroon,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  loginBtnPressed: {
    opacity: 0.85,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#fff",
  },
});
