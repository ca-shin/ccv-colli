import { StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  // Splash
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoStage: {
    width: 300,
    height: 100,
  },
  splashLogoImage: {
    width: 300,
    height: 100,
  },
  splashShinMask: {
    position: "absolute",
    left: 128,
    top: 0,
    width: 172,
    height: 62,
    backgroundColor: Colors.cream,
  },
  splashShinClip: {
    position: "absolute",
    left: 128,
    top: 0,
    width: 172,
    height: 62,
    overflow: "hidden",
  },
  splashShinImage: {
    position: "absolute",
    left: -128,
    top: 0,
    width: 300,
    height: 100,
  },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cream,
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerLogo: {
    flex: 1,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateY: -8 }],
  },
  headerLogoImage: {
    width: "100%",
    height: 56,
  },
  headerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
    marginHorizontal: 20,
  },

  // Hamburger icon
  hamburger: {
    gap: 5,
  },
  hamburgerLine: {
    width: 22,
    height: 1.5,
    backgroundColor: Colors.warmBrown,
  },

  // Dropdown
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuDropdown: {
    position: "absolute",
    right: 12,
    width: 240,
    backgroundColor: "#F9F5EE",
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    overflow: "hidden",
  },
  menuSection: {
    padding: 16,
  },
  menuSectionLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  menuLangRow: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  menuLangBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLangBtnActive: {
    backgroundColor: Colors.darkOrange,
  },
  menuLangText: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.secondaryText,
  },
  menuLangTextActive: {
    color: "#fff",
  },
  menuAdminBtn: {
    marginLeft: "auto",
    padding: 8,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
  },

  // Section cards
  centerStage: {
    position: "absolute",
    top: 0,
    right: 24,
    bottom: 0,
    left: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  cards: {
    width: "100%",
  },
  cardWrapper: {
    width: "100%",
  },
  card: {
    paddingVertical: 22,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  cardSeparator: {
    width: "60%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(44, 31, 20, 0.15)",
    alignSelf: "center",
  },
  cardTitle: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    letterSpacing: -0.5,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 2,
  },
  footerLine1: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.green,
    letterSpacing: 0.5,
  },
  footerLogo: {
    width: 170,
    height: 49,
  },
  poweredByLink: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  poweredByText: {
    fontSize: 9,
    fontFamily: "Montserrat_400Regular",
    color: "rgba(44, 31, 20, 0.38)",
    letterSpacing: 0.4,
  },
});
