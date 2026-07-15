import { useFonts } from "expo-font";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IntroSplash } from "@/components/IntroSplash";
import { queryClient } from "@/lib/query-client";

let introPlayedThisRuntime = false;

function RootLayoutNav({ redirectHomeOnMount }: { redirectHomeOnMount: boolean }) {
  const didRedirectHome = React.useRef(false);

  React.useEffect(() => {
    if (!redirectHomeOnMount || didRedirectHome.current) return;
    didRedirectHome.current = true;
    router.replace("/");
  }, [redirectHomeOnMount]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="menu" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="admina" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [showIntro, setShowIntro] = React.useState(!introPlayedThisRuntime);
  const [redirectHomeAfterIntro, setRedirectHomeAfterIntro] = React.useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
    Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
    PlayfairDisplay_400Regular: require("@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf"),
    Montserrat_400Regular: require("@expo-google-fonts/montserrat/400Regular/Montserrat_400Regular.ttf"),
    Montserrat_600SemiBold: require("@expo-google-fonts/montserrat/600SemiBold/Montserrat_600SemiBold.ttf"),
    Spectral_400Regular: require("@expo-google-fonts/spectral/400Regular/Spectral_400Regular.ttf"),
  });

  const handleIntroDone = React.useCallback(() => {
    introPlayedThisRuntime = true;
    setRedirectHomeAfterIntro(true);
    setShowIntro(false);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {showIntro ? (
            <IntroSplash onDone={handleIntroDone} />
          ) : (
            <RootLayoutNav redirectHomeOnMount={redirectHomeAfterIntro} />
          )}
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
