import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import { View, ActivityIndicator } from "react-native";
import supabase from "@/lib/supabase";
import { useStore } from "@/lib/store";

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: "#0a0a0a",
    surface: "#141414",
    surfaceVariant: "#1f1f1f",
    primary: "#7c3aed",
    primaryContainer: "#3b0764",
    onPrimary: "#f5f5f5",
    onBackground: "#f5f5f5",
    onSurface: "#f5f5f5",
    onSurfaceVariant: "#a3a3a3",
    outline: "#404040",
    error: "#ef4444",
  },
};

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { session } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) {
      const inAuthGroup = segments[0] === "(auth)";
      if (!session && !inAuthGroup) {
        router.replace("/(auth)/login");
      } else if (session && inAuthGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [session, segments, ready]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        useStore.getState().setSession(session);
        useStore.getState().setUser(session?.user ?? null);
        setReady(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) {
          useStore.getState().setSession(session);
          useStore.getState().setUser(session?.user ?? null);
        }
      }
    );
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return ready;
}

export default function RootLayout() {
  const ready = useProtectedRoute();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <PaperProvider theme={darkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="brief/[weekId]"
          options={{
            headerShown: true,
            headerTitle: "Weekly Brief",
            headerStyle: { backgroundColor: "#141414" },
            headerTintColor: "#f5f5f5",
            presentation: "card",
          }}
        />
      </Stack>
    </PaperProvider>
  );
}
