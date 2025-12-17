import React, { useState, useEffect, useCallback } from "react";
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ParkingSpace } from "../types";

type ManageListingsNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const ManageListingsScreen = () => {
  const navigation = useNavigation<ManageListingsNavigationProp>();
  const { user } = useAuth();
  const [listings, setListings] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching listings for user:", user.id);
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Fetched listings:", data?.length || 0);
      setListings(data || []);
    } catch (error: any) {
      console.error("Error fetching listings:", error);
      Alert.alert("Error", error.message || "Failed to load listings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user, fetchListings]);

  // Refresh listings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchListings();
      }
    }, [user, fetchListings])
  );

  const handleToggleActive = async (space: ParkingSpace) => {
    // If deactivating, check for future bookings
    if (space.is_active) {
      try {
        const { data: futureBookings, error: checkError } = await supabase
          .from("bookings")
          .select("id")
          .eq("space_id", space.id)
          .in("status", ["pending", "confirmed"])
          .gt("start_time", new Date().toISOString());

        if (checkError) throw checkError;

        if (futureBookings && futureBookings.length > 0) {
          Alert.alert(
            "Deactivate Listing",
            `This listing has ${futureBookings.length} future booking(s). Deactivating will cancel these bookings. Continue?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Deactivate",
                style: "destructive",
                onPress: async () => {
                  await performDeactivation(space.id);
                },
              },
            ]
          );
          return;
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to check bookings");
        console.error(error);
        return;
      }
    }

    await performDeactivation(space.id);
  };

  const performDeactivation = async (spaceId: string) => {
    try {
      const space = listings.find((s) => s.id === spaceId);
      if (!space) return;

      const { error } = await supabase
        .from("parking_spaces")
        .update({ is_active: !space.is_active })
        .eq("id", spaceId);

      if (error) throw error;
      fetchListings();

      if (!space.is_active) {
        Alert.alert("Success", "Listing activated");
      } else {
        Alert.alert(
          "Listing Deactivated",
          "Future bookings for this listing have been cancelled."
        );
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to update listing");
      console.error(error);
    }
  };

  const handleDelete = async (spaceId: string) => {
    // Check for existing bookings (past and future)
    try {
      const { data: allBookings, error: checkError } = await supabase
        .from("bookings")
        .select("id, start_time, status")
        .eq("space_id", spaceId);

      if (checkError) throw checkError;

      const futureBookings =
        allBookings?.filter(
          (b) =>
            new Date(b.start_time) > new Date() &&
            ["pending", "confirmed"].includes(b.status)
        ) || [];

      const pastBookings =
        allBookings?.filter(
          (b) =>
            new Date(b.start_time) <= new Date() ||
            !["pending", "confirmed"].includes(b.status)
        ) || [];

      let message = "Are you sure you want to delete this listing?";
      if (futureBookings.length > 0) {
        message += `\n\nThis will cancel ${futureBookings.length} future booking(s).`;
      }
      if (pastBookings.length > 0) {
        message += `\n\nNote: ${pastBookings.length} past booking(s) will be preserved for records.`;
      }

      Alert.alert("Delete Listing", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // The database trigger will handle cancelling future bookings
              const { error } = await supabase
                .from("parking_spaces")
                .delete()
                .eq("id", spaceId);

              if (error) throw error;
              fetchListings();

              if (futureBookings.length > 0) {
                Alert.alert(
                  "Listing Deleted",
                  `Listing deleted. ${futureBookings.length} future booking(s) have been cancelled and users have been notified.`
                );
              } else {
                Alert.alert("Success", "Listing deleted");
              }
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete listing");
              console.error(error);
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", "Failed to check bookings before deletion");
      console.error(error);
    }
  };

  const renderListingItem = ({ item }: { item: ParkingSpace }) => {
    return (
      <View style={styles.listingCard}>
        <View style={styles.listingHeader}>
          <Text style={styles.listingTitle}>{item.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.is_active ? "#34C759" : "#8E8E93" },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_active ? "ACTIVE" : "INACTIVE"}
            </Text>
          </View>
        </View>

        <Text style={styles.address}>{item.address}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            {item.price_per_hour ? `LKR ${item.price_per_hour}/hour` : ""}
            {item.price_per_hour && item.price_per_day ? " • " : ""}
            {item.price_per_day ? `LKR ${item.price_per_day}/day` : ""}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() =>
              navigation.navigate("EditSpace", { spaceId: item.id })
            }
          >
            <Text style={[styles.actionButtonText, styles.editButtonText]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.toggleButton]}
            onPress={() => handleToggleActive(item)}
          >
            <Text style={styles.actionButtonText}>
              {item.is_active ? "Deactivate" : "Activate"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Delete
            </Text>
          </TouchableOpacity>
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
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddSpace")}
      >
        <Text style={styles.addButtonText}>+ Add New Listing</Text>
      </TouchableOpacity>

      <FlatList
        data={listings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchListings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No listings yet</Text>
            <Text style={styles.emptySubtext}>
              Add a parking space to start earning
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
  addButton: {
    backgroundColor: "#007AFF",
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 15,
    paddingTop: 0,
  },
  listingCard: {
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
  listingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listingTitle: {
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
  priceRow: {
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#007AFF",
  },
  toggleButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  editButtonText: {
    color: "#fff",
  },
  actionButtonText: {
    fontWeight: "600",
    color: "#333",
  },
  deleteButtonText: {
    color: "#fff",
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
});

export default ManageListingsScreen;
