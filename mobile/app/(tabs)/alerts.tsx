import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle } from "lucide-react-native";
import supabase from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/format";

interface Alert {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  category: string;
  is_read: boolean;
  created_at: string;
  competitors: { name: string } | null;
}

const severityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  info: "#3b82f6",
};

export default function AlertsTab() {
  const user = useStore((s) => s.user);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, body, severity, category, is_read, created_at, competitors(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  function onRefresh() {
    setRefreshing(true);
    fetchAlerts();
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id);
    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
      );
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: "#ef4444", fontSize: 16, textAlign: "center" }}>{error}</Text>
        <TouchableOpacity
          onPress={fetchAlerts}
          style={{ marginTop: 16, backgroundColor: "#7c3aed", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: "#f5f5f5", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
            colors={["#7c3aed"]}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <AlertTriangle size={24} color="#7c3aed" />
              <Text style={{ fontSize: 22, fontWeight: "700", color: "#f5f5f5" }}>Alerts</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#5c5c5c", fontSize: 15 }}>No alerts yet</Text>
            <Text style={{ color: "#404040", fontSize: 13, marginTop: 4 }}>
              Alerts will appear here when competitors make moves.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => markAsRead(item.id)}
            style={{
              backgroundColor: item.is_read ? "#0a0a0a" : "#141414",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: item.is_read ? "#1f1f1f" : "#2b2b2b",
              padding: 16,
              marginHorizontal: 20,
              marginBottom: 10,
              opacity: item.is_read ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: severityColors[item.severity] || "#5c5c5c",
                  marginTop: 5,
                }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#f5f5f5",
                      fontSize: 15,
                      fontWeight: "600",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: "#5c5c5c", fontSize: 11, marginLeft: 8 }}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
                {item.competitors?.name && (
                  <Text style={{ color: "#7c3aed", fontSize: 12, fontWeight: "500", marginTop: 2 }}>
                    {item.competitors.name}
                  </Text>
                )}
                {item.body && (
                  <Text style={{ color: "#a3a3a3", fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
