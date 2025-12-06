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
import { ParkingSpace } from "../types";

type ManageListingsNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const ManageListingsScreen = () => {
  const navigation = useNavigation<ManageListingsNavigationProp>();
  const { user } = useAuth();
  const [listings, setListings] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load listings");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleActive = async (space: ParkingSpace) => {
    try {
      const { error } = await supabase
        .from("parking_spaces")
        .update({ is_active: !space.is_active })
        .eq("id", space.id);

      if (error) throw error;
      fetchListings();
    } catch (error: any) {
      Alert.alert("Error", "Failed to update listing");
      console.error(error);
    }
  };

  const handleDelete = async (spaceId: string) => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("parking_spaces")
                .delete()
                .eq("id", spaceId);

              if (error) throw error;
              fetchListings();
              Alert.alert("Success", "Listing deleted");
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete listing");
              console.error(error);
            }
          },
        },
      ]
    );
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
            ${item.price_per_hour}/hour • ${item.price_per_day}/day
          </Text>
        </View>

        <View style={styles.buttonRow}>
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
  toggleButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
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
