import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { ParkingSpace } from "../types";

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MapScreen = () => {
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    fetchParkingSpaces();
  }, []);

  // Animate to user location when it becomes available
  useEffect(() => {
    if (location && mapRef.current) {
      const region: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [location]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to find nearby parking"
      );
      return;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your current location");
    }
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
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      fetchParkingSpaces();
      // Reset map to user location if available
      if (location && mapRef.current) {
        const region: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        mapRef.current.animateToRegion(region, 1000);
      }
      return;
    }

    setSearching(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let geocodeSuccess = false;

      // Step 1: Try to geocode the address (convert address to coordinates)
      try {
        const geocodeResults = await Location.geocodeAsync(trimmedQuery);

        if (geocodeResults && geocodeResults.length > 0) {
          // Use the first result
          const searchedLocation = geocodeResults[0];
          latitude = searchedLocation.latitude;
          longitude = searchedLocation.longitude;
          geocodeSuccess = true;

          // Step 2: Navigate map to the searched location
          if (mapRef.current) {
            const region: Region = {
              latitude,
              longitude,
              latitudeDelta: 0.1, // Slightly wider view to show nearby areas
              longitudeDelta: 0.1,
            };
            mapRef.current.animateToRegion(region, 1000);
          }
        }
      } catch (geocodeError) {
        console.error("Geocoding error:", geocodeError);
        // Continue with database search even if geocoding fails
      }

      // Step 3: Search for parking spaces in the database
      // First try to find exact matches in address
      const { data: exactMatches, error: exactError } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("is_active", true)
        .ilike("address", `%${trimmedQuery}%`);

      if (exactError) {
        console.error("Search error:", exactError);
      }

      let nearbySpaces: ParkingSpace[] = [];

      // If geocoding was successful, also find nearby parking spaces
      if (geocodeSuccess && latitude !== null && longitude !== null) {
        // Calculate approximate radius (0.1 degrees ≈ 11km)
        const radius = 0.05; // ~5.5km radius
        const { data: nearbyData, error: nearbyError } = await supabase
          .from("parking_spaces")
          .select("*")
          .eq("is_active", true)
          .gte("latitude", latitude - radius)
          .lte("latitude", latitude + radius)
          .gte("longitude", longitude - radius)
          .lte("longitude", longitude + radius);

        if (nearbyError) {
          console.error("Nearby search error:", nearbyError);
        } else {
          nearbySpaces = nearbyData || [];
        }
      }

      // Combine results, prioritizing exact matches
      const allSpaces = [...(exactMatches || []), ...nearbySpaces];

      // Remove duplicates based on id
      const uniqueSpaces = allSpaces.filter(
        (space, index, self) =>
          index === self.findIndex((s) => s.id === space.id)
      );

      setSpaces(uniqueSpaces);

      // If geocoding failed but we have results, center map on the first result
      if (!geocodeSuccess && uniqueSpaces.length > 0 && mapRef.current) {
        const firstSpace = uniqueSpaces[0];
        const region: Region = {
          latitude: firstSpace.latitude,
          longitude: firstSpace.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        mapRef.current.animateToRegion(region, 1000);
      }

      // Show appropriate message
      if (!geocodeSuccess) {
        // Geocoding failed but we still searched the database
        if (uniqueSpaces.length === 0) {
          Alert.alert(
            "Search Results",
            "Could not find the exact location on the map, but searched the database. No parking spaces found matching your search."
          );
        } else {
          // Show results even though we couldn't geocode
          console.log(
            `Found ${uniqueSpaces.length} parking space(s) matching your search`
          );
        }
      } else if (uniqueSpaces.length === 0) {
        Alert.alert(
          "No Parking Spaces",
          "No parking spaces found in this area. The map has been updated to show the searched location."
        );
      }
    } catch (error: any) {
      console.error("Search error details:", error);
      Alert.alert("Error", error.message || "Failed to search location");
    } finally {
      setSearching(false);
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
        <TouchableOpacity
          style={[
            styles.searchButton,
            searching && styles.searchButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={searching}
        >
          <Text style={styles.searchButtonText}>
            {searching ? "Searching..." : "Search"}
          </Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onMapReady={() => {
          // When map is ready, animate to user location if available
          if (location && mapRef.current) {
            const region: Region = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            mapRef.current.animateToRegion(region, 1000);
          }
        }}
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
  searchButtonDisabled: {
    opacity: 0.6,
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;
