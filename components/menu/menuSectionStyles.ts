import { StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export const menuSectionStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    overflow: "hidden",
  },

  // Header
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    backgroundColor: Colors.cream,
    zIndex: 100,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  menuButton: {
    position: "absolute",
    right: 18,
    width: 44,
    height: 44,
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
  // Hamburger icon
  hamburger: {
    gap: 5,
    alignItems: "flex-end",
  },
  hamburgerLine: {
    width: 22,
    height: 1.5,
    backgroundColor: Colors.warmBrown,
    borderRadius: 1,
  },

  // Dropdown menu
  menuOverlay: {
    flex: 1,
  },
  menuDropdown: {
    position: "absolute",
    right: 16,
    left: 16,
    borderRadius: 14,
    backgroundColor: "#FAF8F5",
    boxShadow: "0px 6px 20px rgba(114,47,55,0.10)",
    overflow: "hidden",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 17,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
  },
  menuItemTextActive: {
    color: Colors.darkOrange,
  },
  menuItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.darkOrange,
  },
  menuLangSection: {
    flexDirection: "row",
    gap: 20,
    padding: 16,
    alignItems: "center",
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

  // Scroll
  scroll: { flex: 1 },

  // Category
  categoryBlock: {
    marginTop: 36,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 25.6,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 24,
    letterSpacing: -0.5,
  },

  // Dish
  dishRow: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  dishNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    marginBottom: 4,
  },
  dishDietIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 7,
  },
  dishGlutenFreeImage: {
    width: 14,
    height: 14,
    tintColor: Colors.glutenBeige,
  },
  dishName: {
    fontSize: 18,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    lineHeight: 26,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  dishSubtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  dishPrice: {
    fontSize: 19,
    fontFamily: "Spectral_400Regular",
    color: Colors.darkOrange,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2D9CFB3",
    marginHorizontal: 24,
  },

  // Wine
  wineRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  wineName: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  wineDescription: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  winePriceRow: {
    flexDirection: "row",
  },
  winePrice: {
    fontSize: 17,
    fontFamily: "Spectral_400Regular",
    color: Colors.darkOrange,
  },

  // Center state (loading/error)
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    textAlign: "center",
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: Colors.maroon,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#fff",
  },

  // Dish Detail Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalClose: {
    position: "absolute",
    top: 20,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.beige,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { flex: 1 },
  modalHeader: { paddingTop: 8, paddingBottom: 24 },
  vegBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  vegBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.green,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  glutenFreeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  glutenFreeBadgeIcon: {
    width: 12,
    height: 12,
    tintColor: Colors.glutenBeige,
  },
  glutenFreeBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalDishName: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_400Regular",
    color: Colors.darkOrange,
    marginBottom: 8,
    lineHeight: 36,
  },
  modalPrice: {
    fontSize: 22,
    fontFamily: "Spectral_400Regular",
    color: Colors.darkOrange,
  },
  modalSection: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
    lineHeight: 24,
  },
  modalInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.beige,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: Colors.warmBrown,
    lineHeight: 20,
  },
  allergenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  allergenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.secondaryText,
  },
  allergenText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: Colors.secondaryText,
  },
  // Footer
  footer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
    gap: 2,
  },
  footerLine1: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: Colors.green,
    letterSpacing: 0.5,
  },
  footerLine2: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: Colors.green,
    letterSpacing: 2,
  },
});
