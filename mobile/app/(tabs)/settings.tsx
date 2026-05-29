import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Settings, LogOut } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import supabase from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { useRouter } from "expo-router";

export default function SettingsTab() {
  const router = useRouter();
  const { user, profile, setProfile, clearUser, notificationToken, setNotificationToken } = useStore();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileFetched = useRef(false);

  useEffect(() => {
    if (user && !profile && !profileFetched.current) {
      profileFetched.current = true;
      supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) setProfile(data);
        });
    }
  }, [user, profile, setProfile]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ granted }) => {
      setPushEnabled(granted);
    });
  }, []);

  async function togglePush(value: boolean) {
    setToggling(true);
    try {
      if (value) {
        if (!Device.isDevice) {
          Alert.alert("Push Notification", "Push notifications require a physical device.");
          return;
        }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          Alert.alert("Permission Denied", "Enable notifications in your device settings.");
          setPushEnabled(false);
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        setNotificationToken(tokenData.data);
        if (user) {
          await supabase.from("users").update({ push_token: tokenData.data }).eq("id", user.id);
        }
        setPushEnabled(true);
      } else {
        setNotificationToken(null);
        setPushEnabled(false);
      }
    } catch {
      Alert.alert("Error", "Could not update notification settings.");
      setPushEnabled(false);
    } finally {
      setToggling(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      clearUser();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Error", "Failed to sign out.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <Settings size={24} color="#7c3aed" />
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#f5f5f5" }}>Settings</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            backgroundColor: "#141414",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#2b2b2b",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#a3a3a3", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Profile
          </Text>
          <Text style={{ color: "#f5f5f5", fontSize: 16, fontWeight: "600", marginTop: 12 }}>
            {profile?.email || user?.email || "Unknown"}
          </Text>
          {profile?.company_name && (
            <Text style={{ color: "#a3a3a3", fontSize: 14, marginTop: 2 }}>
              {profile.company_name}
            </Text>
          )}
          <Text style={{ color: "#5c5c5c", fontSize: 12, marginTop: 4, textTransform: "capitalize" }}>
            {profile?.plan_tier || "free"} plan
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#141414",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#2b2b2b",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#a3a3a3", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
            Notifications
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#f5f5f5", fontSize: 15 }}>Push Notifications</Text>
            {toggling ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : (
              <Switch
                value={pushEnabled}
                onValueChange={togglePush}
                trackColor={{ false: "#2b2b2b", true: "#7c3aed" }}
                thumbColor={pushEnabled ? "#f5f5f5" : "#5c5c5c"}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#141414",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#2b2b2b",
            padding: 16,
            marginBottom: 24,
          }}
        >
          {signingOut ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <>
              <LogOut size={18} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "600" }}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={{ color: "#404040", fontSize: 12, textAlign: "center" }}>
          Vigil Mobile v1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
}
