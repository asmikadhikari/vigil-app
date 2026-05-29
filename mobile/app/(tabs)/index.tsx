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
import { useRouter } from "expo-router";
import { Eye, ChevronRight } from "lucide-react-native";
import supabase from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { formatDate, timeAgo } from "@/lib/format";

interface Alert {
  id: string;
  title: string;
  severity: string;
  category: string;
  body: string | null;
  created_at: string;
  competitors: { name: string } | null;
}

interface Brief {
  id: string;
  week_start: string;
  bullets: string[];
  generated_at: string;
}

export default function DashboardTab() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [alertsRes, briefsRes] = await Promise.all([
        supabase
          .from("alerts")
          .select("id, title, severity, category, body, created_at, competitors(name)")
          .eq("user_id", user.id)
          .gte("created_at", today)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("weekly_briefs")
          .select("id, week_start, bullets, generated_at")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(5),
      ]);

      if (alertsRes.error) throw alertsRes.error;
      if (briefsRes.error) throw briefsRes.error;

      const parsedBriefs = (briefsRes.data || []).map((b) => {
        let bullets: string[] = [];
        try {
          bullets = typeof b.bullets === "string" ? JSON.parse(b.bullets) : (b.bullets ?? []);
        } catch {
          bullets = [];
        }
        return { ...b, bullets };
      });

      setAlerts(alertsRes.data || []);
      setBriefs(parsedBriefs);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  const highPriorityCount = alerts.filter(
    (a) => a.severity === "high" || a.severity === "critical"
  ).length;

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
          onPress={fetchData}
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
        data={briefs}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <Eye size={28} color="#7c3aed" />
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#f5f5f5", letterSpacing: 0.5 }}>
                Vigil
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#141414",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#2b2b2b",
                padding: 20,
                marginBottom: 24,
              }}
            >
              <Text style={{ color: "#a3a3a3", fontSize: 13, fontWeight: "500" }}>
                Today's High-Priority Alerts
              </Text>
              <Text style={{ color: "#f5f5f5", fontSize: 42, fontWeight: "700", marginTop: 4 }}>
                {highPriorityCount}
              </Text>
              {alerts.length > 0 && (
                <View style={{ gap: 8, marginTop: 16 }}>
                  {alerts.slice(0, 3).map((alert) => (
                    <View key={alert.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            alert.severity === "critical"
                              ? "#ef4444"
                              : alert.severity === "high"
                              ? "#f97316"
                              : alert.severity === "medium"
                              ? "#eab308"
                              : "#3b82f6",
                        }}
                      />
                      <Text style={{ color: "#c7c7c7", fontSize: 13, flex: 1 }} numberOfLines={1}>
                        {alert.title}
                      </Text>
                      <Text style={{ color: "#5c5c5c", fontSize: 11 }}>{timeAgo(alert.created_at)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Text style={{ fontSize: 18, fontWeight: "600", color: "#f5f5f5", marginBottom: 12 }}>
              Latest Briefs
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ color: "#5c5c5c", fontSize: 15 }}>
              No briefs yet. Intelligence is being gathered.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/brief/${item.id}`)}
            style={{
              backgroundColor: "#141414",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#2b2b2b",
              padding: 16,
              marginHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#a3a3a3", fontSize: 12, fontWeight: "500" }}>
                  Week of {formatDate(item.week_start)}
                </Text>
                <Text style={{ color: "#c7c7c7", fontSize: 13, marginTop: 6 }} numberOfLines={2}>
                  {Array.isArray(item.bullets) && item.bullets.length > 0
                    ? item.bullets[0]
                    : "No bullets available"}
                </Text>
              </View>
              <ChevronRight size={18} color="#5c5c5c" />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
