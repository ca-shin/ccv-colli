import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Pagina non trovata" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Pagina non trovata</Text>
        <Text style={styles.description}>Il menu richiesto non è disponibile.</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Torna alla home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.cream,
  },
  title: {
    color: Colors.darkOrange,
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 28,
    fontWeight: "bold",
  },
  description: {
    color: Colors.secondaryText,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginTop: 10,
    textAlign: "center",
  },
  link: {
    marginTop: 18,
    paddingVertical: 15,
  },
  linkText: {
    color: Colors.green,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
