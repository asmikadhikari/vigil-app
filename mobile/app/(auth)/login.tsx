import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye } from "lucide-react-native";
import supabase from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert("Check your email", "We sent you a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
      >
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <Eye size={48} color="#7c3aed" />
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: "#f5f5f5",
              marginTop: 12,
              letterSpacing: 1,
            }}
          >
            VIGIL
          </Text>
          <Text style={{ color: "#a3a3a3", marginTop: 4, fontSize: 14 }}>
            AI Competitive Intelligence
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ color: "#a3a3a3", fontSize: 13, marginBottom: 6, fontWeight: "500" }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#5c5c5c"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={{
                backgroundColor: "#141414",
                borderWidth: 1,
                borderColor: "#2b2b2b",
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                color: "#f5f5f5",
              }}
            />
          </View>

          <View>
            <Text style={{ color: "#a3a3a3", fontSize: 13, marginBottom: 6, fontWeight: "500" }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#5c5c5c"
              secureTextEntry
              style={{
                backgroundColor: "#141414",
                borderWidth: 1,
                borderColor: "#2b2b2b",
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                color: "#f5f5f5",
              }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#7c3aed",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#f5f5f5" />
            ) : (
              <Text style={{ color: "#f5f5f5", fontSize: 16, fontWeight: "600" }}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={{ marginTop: 24, alignItems: "center" }}
        >
          <Text style={{ color: "#a3a3a3", fontSize: 14 }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text style={{ color: "#7c3aed", fontWeight: "600" }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
