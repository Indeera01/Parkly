import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Booking } from "../types";

type BookingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BookingsScreen = () => {
  const navigation = useNavigation<BookingsNavigationProp>();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, space:parking_spaces(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load bookings");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("bookings")
                .update({ status: "cancelled" })
                .eq("id", bookingId);

              if (error) throw error;
              fetchBookings();
              Alert.alert("Success", "Booking cancelled");
            } catch (error: any) {
              Alert.alert("Error", "Failed to cancel booking");
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (bookingId: string) => {
    Alert.alert(
      "Delete Booking",
      "Are you sure you want to delete this booking? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("bookings")
                .delete()
                .eq("id", bookingId);

              if (error) {
                console.error("Delete error:", error);
                throw error;
              }
              fetchBookings();
              Alert.alert("Success", "Booking deleted");
            } catch (error: any) {
              console.error("Delete booking error:", error);
              Alert.alert(
                "Error",
                error.message ||
                  "Failed to delete booking. Please check your permissions."
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "#34C759";
      case "cancelled":
      case "host_cancelled":
      case "space_deleted":
        return "#FF3B30";
      case "completed":
        return "#8E8E93";
      default:
        return "#FF9500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "host_cancelled":
        return "CANCELLED BY HOST";
      case "space_deleted":
        return "SPACE DELETED";
      default:
        return status.toUpperCase();
    }
  };

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const space = item.space as any;
    const isCancelledByHost =
      item.status === "host_cancelled" || item.status === "space_deleted";
    const spaceTitle = space?.title || "Space No Longer Available";
    const spaceAddress = space?.address || "Address not available";

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.spaceTitle}>{spaceTitle}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {isCancelledByHost && item.cancellation_reason && (
          <View style={styles.cancellationNotice}>
            <Text style={styles.cancellationText}>
              {item.cancellation_reason}
            </Text>
          </View>
        )}

        <Text style={styles.address}>{spaceAddress}</Text>

        <View style={styles.bookingDetails}>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Start: </Text>
            {formatDate(item.start_time)}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>End: </Text>
            {formatDate(item.end_time)}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Vehicles: </Text>
            {item.vehicle_count || 1}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Total: </Text>LKR{" "}
            {item.total_price.toFixed(2)}
          </Text>
          {(space?.price_per_hour || space?.price_per_day) && (
            <Text style={styles.pricingInfo}>
              {space.price_per_hour && (
                <Text>LKR {space.price_per_hour}/hr</Text>
              )}
              {space.price_per_hour && space.price_per_day && " • "}
              {space.price_per_day && (
                <Text>LKR {space.price_per_day}/day</Text>
              )}
            </Text>
          )}
        </View>

        <View style={styles.actionButtonsContainer}>
          {item.status === "confirmed" && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

          {(item.status === "host_cancelled" ||
            item.status === "space_deleted") && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                This booking was cancelled by the parking space host. If you
                have any questions, please contact support.
              </Text>
            </View>
          )}

          {/* Show delete button for non-confirmed bookings or past bookings */}
          {(item.status !== "confirmed" ||
            new Date(item.end_time) < new Date()) && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Book a parking space to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 15,
  },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  spaceTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  address: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  bookingDetails: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: "600",
  },
  pricingInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  actionButtonsContainer: {
    marginTop: 12,
    gap: 8,
  },
  cancelButton: {
    padding: 10,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteButton: {
    padding: 10,
    backgroundColor: "#8E8E93",
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  cancellationNotice: {
    backgroundColor: "#FFF3CD",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9500",
  },
  cancellationText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});

export default BookingsScreen;
