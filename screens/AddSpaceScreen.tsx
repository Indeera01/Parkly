import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

type AddSpaceNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AddSpaceScreen = () => {
  const navigation = useNavigation<AddSpaceNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    latitude: 0,
    longitude: 0,
    price_per_hour: "",
    price_per_day: "",
    availability_start: "",
    availability_end: "",
  });

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setFormData({
      ...formData,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    // Reverse geocode to get address
    const geocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (geocode.length > 0) {
      const addr = geocode[0];
      const address = `${addr.street || ""} ${addr.city || ""} ${
        addr.region || ""
      }`.trim();
      setFormData({
        ...formData,
        address,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (
      !formData.title ||
      !formData.address ||
      !formData.price_per_hour ||
      !formData.price_per_day
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      Alert.alert("Error", "Please set the location");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("parking_spaces").insert([
        {
          host_id: user.id,
          title: formData.title,
          description: formData.description || null,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          price_per_hour: parseFloat(formData.price_per_hour),
          price_per_day: parseFloat(formData.price_per_day),
          availability_start: formData.availability_start || null,
          availability_end: formData.availability_end || null,
          is_active: true,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Parking space added successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add parking space");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Downtown Parking Spot"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your parking space..."
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter address"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
        />

        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
        >
          <Text style={styles.locationButtonText}>Use Current Location</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Price Per Hour ($) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={formData.price_per_hour}
          onChangeText={(text) =>
            setFormData({ ...formData, price_per_hour: text })
          }
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Price Per Day ($) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          value={formData.price_per_day}
          onChangeText={(text) =>
            setFormData({ ...formData, price_per_day: text })
          }
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Availability Start (HH:mm)</Text>
        <TextInput
          style={styles.input}
          placeholder="09:00"
          value={formData.availability_start}
          onChangeText={(text) =>
            setFormData({ ...formData, availability_start: text })
          }
        />

        <Text style={styles.label}>Availability End (HH:mm)</Text>
        <TextInput
          style={styles.input}
          placeholder="18:00"
          value={formData.availability_end}
          onChangeText={(text) =>
            setFormData({ ...formData, availability_end: text })
          }
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Parking Space</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  locationButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  locationButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddSpaceScreen;
