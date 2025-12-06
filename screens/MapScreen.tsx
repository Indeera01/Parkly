import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { ParkingSpace } from "../types";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocationPermission();
    fetchParkingSpaces();
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to find nearby parking"
      );
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation);
  };

  const fetchParkingSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setSpaces(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load parking spaces");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (space: ParkingSpace) => {
    navigation.navigate("SpaceDetail", { spaceId: space.id });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchParkingSpaces();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("is_active", true)
        .ilike("address", `%${searchQuery}%`);

      if (error) throw error;
      setSpaces(data || []);
    } catch (error: any) {
      Alert.alert("Error", "Failed to search parking spaces");
      console.error(error);
    }
  };

  const initialRegion = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {spaces.map((space) => (
          <Marker
            key={space.id}
            coordinate={{
              latitude: space.latitude,
              longitude: space.longitude,
            }}
            title={space.title}
            description={`$${space.price_per_hour}/hour`}
            onPress={() => handleMarkerPress(space)}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;
