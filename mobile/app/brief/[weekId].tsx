import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import supabase from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";

interface Brief {
  id: string;
  week_start: string;
  bullets: string[];
  swot_analysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  generated_at: string;
}

export default function BriefDetailScreen() {
  const { weekId } = useLocalSearchParams<{ weekId: string }>();
  const user = useStore((s) => s.user);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!weekId || !user) return;
    let cancelled = false;

    async function fetchBrief() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("weekly_briefs")
          .select("*")
          .eq("id", weekId)
          .eq("user_id", user!.id)
          .single();

        if (cancelled) return;

        if (error) {
          setError(error.message);
        } else if (data) {
          let bullets: string[] = [];
          try {
            bullets = typeof data.bullets === "string" ? JSON.parse(data.bullets) : (data.bullets ?? []);
          } catch {
            bullets = [];
          }

          let swot_analysis = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
          try {
            if (typeof data.swot_analysis === "string") {
              swot_analysis = JSON.parse(data.swot_analysis);
            } else if (data.swot_analysis) {
              swot_analysis = data.swot_analysis;
            }
          } catch {
            swot_analysis = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
          }

          setBrief({ ...data, bullets, swot_analysis });
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load brief");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBrief();
    return () => { cancelled = true; };
  }, [weekId, user]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  if (error || !brief) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: "#ef4444", fontSize: 16, textAlign: "center" }}>
          {error || "Brief not found"}
        </Text>
      </SafeAreaView>
    );
  }

  const swot = brief.swot_analysis;

  function SWOTBox(title: string, items: string[], color: string) {
    return (
      <View
        style={{
          backgroundColor: "#141414",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#2b2b2b",
          padding: 14,
          flex: 1,
        }}
      >
        <Text style={{ color, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>{title}</Text>
        {items.length === 0 ? (
          <Text style={{ color: "#5c5c5c", fontSize: 12 }}>None</Text>
        ) : (
          items.map((item, i) => (
            <Text key={i} style={{ color: "#c7c7c7", fontSize: 12, marginBottom: 4, lineHeight: 18 }}>
              • {item}
            </Text>
          ))
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: "#a3a3a3", fontSize: 13, fontWeight: "500" }}>
          Week of {formatDate(brief.week_start)}
        </Text>
        <Text style={{ color: "#f5f5f5", fontSize: 24, fontWeight: "700", marginTop: 4 }}>
          Intelligence Brief
        </Text>
        <Text style={{ color: "#5c5c5c", fontSize: 12, marginTop: 4 }}>
          Generated {formatDate(brief.generated_at)}
        </Text>

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#f5f5f5", fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Executive Summary
          </Text>
          {brief.bullets.length === 0 ? (
            <Text style={{ color: "#5c5c5c", fontSize: 14 }}>No summary available.</Text>
          ) : (
            brief.bullets.map((bullet, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Text style={{ color: "#7c3aed", fontSize: 14 }}>•</Text>
                <Text style={{ color: "#c7c7c7", fontSize: 14, lineHeight: 20, flex: 1 }}>{bullet}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#f5f5f5", fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            SWOT Analysis
          </Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {SWOTBox("Strengths", swot.strengths, "#22c55e")}
              {SWOTBox("Weaknesses", swot.weaknesses, "#ef4444")}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {SWOTBox("Opportunities", swot.opportunities, "#3b82f6")}
              {SWOTBox("Threats", swot.threats, "#f97316")}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
