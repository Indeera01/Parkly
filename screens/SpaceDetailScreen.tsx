import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ParkingSpace, Booking } from "../types";

type SpaceDetailRouteProp = RouteProp<RootStackParamList, "SpaceDetail">;
type SpaceDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SpaceDetailScreen = () => {
  const route = useRoute<SpaceDetailRouteProp>();
  const navigation = useNavigation<SpaceDetailNavigationProp>();
  const { spaceId } = route.params;
  const { user } = useAuth();

  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    fetchSpaceDetails();
  }, [spaceId]);

  const fetchSpaceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("id", spaceId)
        .single();

      if (error) throw error;
      setSpace(data);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load parking space details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!startTime || !endTime) {
      Alert.alert("Error", "Please select start and end time");
      return;
    }

    if (!user || !space) return;

    setBookingLoading(true);
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const totalPrice = hours * space.price_per_hour;

      const { error } = await supabase.from("bookings").insert([
        {
          user_id: user.id,
          space_id: space.id,
          start_time: startTime,
          end_time: endTime,
          total_price: totalPrice,
          status: "confirmed",
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Booking confirmed!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create booking");
      console.error(error);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!space) {
    return (
      <View style={styles.centerContainer}>
        <Text>Parking space not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{space.title}</Text>
        <Text style={styles.address}>{space.address}</Text>

        {space.description && (
          <Text style={styles.description}>{space.description}</Text>
        )}

        <View style={styles.priceContainer}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Per Hour</Text>
            <Text style={styles.priceValue}>${space.price_per_hour}</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Per Day</Text>
            <Text style={styles.priceValue}>${space.price_per_day}</Text>
          </View>
        </View>

        {space.availability_start && space.availability_end && (
          <View style={styles.availabilityContainer}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Text style={styles.availabilityText}>
              {space.availability_start} - {space.availability_end}
            </Text>
          </View>
        )}

        <View style={styles.bookingContainer}>
          <Text style={styles.sectionTitle}>Book This Space</Text>
          <TextInput
            style={styles.input}
            placeholder="Start Time (YYYY-MM-DD HH:mm)"
            value={startTime}
            onChangeText={setStartTime}
          />
          <TextInput
            style={styles.input}
            placeholder="End Time (YYYY-MM-DD HH:mm)"
            value={endTime}
            onChangeText={setEndTime}
          />
          <TouchableOpacity
            style={styles.bookButton}
            onPress={handleBooking}
            disabled={bookingLoading}
          >
            {bookingLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  priceItem: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  availabilityContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  availabilityText: {
    fontSize: 16,
    color: "#333",
  },
  bookingContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  bookButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SpaceDetailScreen;
