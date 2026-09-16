import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function OfflineIndicator() {
  const {
    isOffline,
    isAuthenticated,
    lastOnlineAuthentication,
    offlineEligible,
  } = useAuth();
  if (!(isOffline && isAuthenticated && offlineEligible)) return null;

  const lastSynced = lastOnlineAuthentication
    ? new Date(lastOnlineAuthentication).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "unknown";

  return (
    <View
      style={[
        styles.container,
        isOffline && isAuthenticated && offlineEligible && styles.visible,
      ]}
    >
      <Text style={styles.text}>Using saved data</Text>
      <Text style={styles.caption}>Last synced: {lastSynced}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: "#E0F7FA",
    borderLeftWidth: 4,
    borderLeftColor: "#00E6A8",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    color: "#00695C",
    fontWeight: "600",
    fontSize: 12,
  },
  caption: {
    color: "#00695C",
    fontSize: 10,
    marginTop: 2,
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
});