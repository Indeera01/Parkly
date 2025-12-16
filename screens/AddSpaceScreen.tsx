import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

type AddSpaceNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddSpaceRouteProp = RouteProp<
  RootStackParamList,
  "AddSpace" | "EditSpace"
>;

const AddSpaceScreen = () => {
  const navigation = useNavigation<AddSpaceNavigationProp>();
  const route = useRoute<AddSpaceRouteProp>();
  const { user } = useAuth();

  // Get spaceId from route params if editing
  const spaceId =
    route.name === "EditSpace" && route.params?.spaceId
      ? route.params.spaceId
      : undefined;
  const isEditMode = !!spaceId;
  const mapRef = useRef<MapView>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] =
    useState<Location.LocationObject | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    latitude: 0,
    longitude: 0,
    price_per_hour: "",
    price_per_day: "",
    max_vehicles: "1",
    repeating: true, // Weekly repeating by default
  });

  // Time picker modal state
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<
    "startTime" | "endTime" | null
  >(null);
  const [tempTime, setTempTime] = useState({ hour: 9, minute: 0 });

  // Calendar modal state for non-repeating dates
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    [date: string]: { startTime: string; endTime: string };
  }>({});
  const [editingDate, setEditingDate] = useState<string | null>(null);

  // Day availability: 0=Sunday, 1=Monday, ..., 6=Saturday
  const [dayAvailability, setDayAvailability] = useState<{
    [key: number]: { enabled: boolean; startTime: string; endTime: string };
  }>({
    0: { enabled: false, startTime: "09:00", endTime: "18:00" },
    1: { enabled: false, startTime: "09:00", endTime: "18:00" },
    2: { enabled: false, startTime: "09:00", endTime: "18:00" },
    3: { enabled: false, startTime: "09:00", endTime: "18:00" },
    4: { enabled: false, startTime: "09:00", endTime: "18:00" },
    5: { enabled: false, startTime: "09:00", endTime: "18:00" },
    6: { enabled: false, startTime: "09:00", endTime: "18:00" },
  });

  const daysOfWeek = [
    { label: "Sunday", value: 0, short: "Sun" },
    { label: "Monday", value: 1, short: "Mon" },
    { label: "Tuesday", value: 2, short: "Tue" },
    { label: "Wednesday", value: 3, short: "Wed" },
    { label: "Thursday", value: 4, short: "Thu" },
    { label: "Friday", value: 5, short: "Fri" },
    { label: "Saturday", value: 6, short: "Sat" },
  ];

  useEffect(() => {
    requestLocationPermission();
    if (isEditMode && spaceId) {
      fetchSpaceData();
    }
  }, [isEditMode, spaceId]);

  const fetchSpaceData = async () => {
    if (!spaceId) return;

    try {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("id", spaceId)
        .single();

      if (error) throw error;

      if (data) {
        // Determine if repeating or non-repeating
        // Check repeating_weekly field, or infer from day_availability_schedule structure
        let isRepeating = data.repeating_weekly !== false;
        if (
          data.day_availability_schedule &&
          data.repeating_weekly === undefined
        ) {
          // Infer from schedule: if keys are numbers (0-6), it's repeating; if dates (YYYY-MM-DD), it's non-repeating
          const keys = Object.keys(data.day_availability_schedule);
          if (keys.length > 0) {
            const firstKey = keys[0];
            // Check if first key is a date string (YYYY-MM-DD format)
            isRepeating = !firstKey.match(/^\d{4}-\d{2}-\d{2}$/);
          }
        }

        // Populate form with existing data
        setFormData({
          title: data.title || "",
          description: data.description || "",
          address: data.address || "",
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          price_per_hour: data.price_per_hour?.toString() || "",
          price_per_day: data.price_per_day?.toString() || "",
          max_vehicles: data.max_vehicles?.toString() || "1",
          repeating: isRepeating,
        });

        if (isRepeating) {
          // Set day availability for repeating schedule
          const newDayAvailability: {
            [key: number]: {
              enabled: boolean;
              startTime: string;
              endTime: string;
            };
          } = {
            0: { enabled: false, startTime: "09:00", endTime: "18:00" },
            1: { enabled: false, startTime: "09:00", endTime: "18:00" },
            2: { enabled: false, startTime: "09:00", endTime: "18:00" },
            3: { enabled: false, startTime: "09:00", endTime: "18:00" },
            4: { enabled: false, startTime: "09:00", endTime: "18:00" },
            5: { enabled: false, startTime: "09:00", endTime: "18:00" },
            6: { enabled: false, startTime: "09:00", endTime: "18:00" },
          };

          // Load from day_availability_schedule if available, otherwise use available_days
          if (data.day_availability_schedule) {
            Object.keys(data.day_availability_schedule).forEach((dayKey) => {
              const dayNum = parseInt(dayKey, 10);
              if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
                const schedule = data.day_availability_schedule[dayNum];
                newDayAvailability[dayNum] = {
                  enabled: true,
                  startTime: schedule.startTime || "09:00",
                  endTime: schedule.endTime || "18:00",
                };
              }
            });
          } else if (
            data.available_days &&
            Array.isArray(data.available_days)
          ) {
            // Fallback to available_days
            data.available_days.forEach((day: number) => {
              if (newDayAvailability[day]) {
                newDayAvailability[day] = {
                  enabled: true,
                  startTime: data.availability_start || "09:00",
                  endTime: data.availability_end || "18:00",
                };
              }
            });
          }

          setDayAvailability(newDayAvailability);
        } else {
          // Load non-repeating dates from day_availability_schedule
          if (data.day_availability_schedule) {
            const dateSchedule: {
              [date: string]: { startTime: string; endTime: string };
            } = {};
            Object.keys(data.day_availability_schedule).forEach((dateKey) => {
              // Check if it's a date string (YYYY-MM-DD format)
              if (dateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const schedule = data.day_availability_schedule[dateKey];
                dateSchedule[dateKey] = {
                  startTime: schedule.startTime || "09:00",
                  endTime: schedule.endTime || "18:00",
                };
              }
            });
            setSelectedDates(dateSchedule);
          }
        }

        // Update map location
        if (data.latitude && data.longitude && mapRef.current) {
          const region: Region = {
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          mapRef.current.animateToRegion(region, 500);
        }
      }
    } catch (error: any) {
      console.error("Error fetching space data:", error);
      Alert.alert("Error", "Failed to load parking space data");
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(currentLocation);

        // Set initial map region to user location
        if (mapRef.current) {
          const region: Region = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          mapRef.current.animateToRegion(region, 500);
        }
      } catch (error) {
        console.error("Error getting location:", error);
      }
    }
  };

  const handleMapPress = async (event: any) => {
    try {
      const coordinate = event.nativeEvent?.coordinate;
      if (
        !coordinate ||
        coordinate.latitude === undefined ||
        coordinate.longitude === undefined
      ) {
        console.error("Invalid coordinate from map press:", event.nativeEvent);
        Alert.alert("Error", "Could not get coordinates from map selection");
        return;
      }
      const { latitude, longitude } = coordinate;
      await updateLocationFromCoordinates(latitude, longitude);
    } catch (error) {
      console.error("Error handling map press:", error);
      Alert.alert("Error", "Failed to select location on map");
    }
  };

  const updateLocationFromCoordinates = async (
    latitude: number,
    longitude: number
  ) => {
    setLocationLoading(true);
    try {
      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let address = "";
      if (geocode.length > 0) {
        const addr = geocode[0];
        address = `${addr.street || ""} ${addr.city || ""} ${
          addr.region || ""
        } ${addr.postalCode || ""}`.trim();
      } else {
        address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      // Update form data with coordinates and address
      setFormData({
        ...formData,
        address,
        latitude,
        longitude,
      });

      // Animate map to selected location
      if (mapRef.current) {
        const region: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        mapRef.current.animateToRegion(region, 500);
      }
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Failed to get address for selected location");
    } finally {
      setLocationLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required");
      return;
    }

    setLocationLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await updateLocationFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your current location");
    } finally {
      setLocationLoading(false);
    }
  };

  const toggleDay = (dayValue: number) => {
    setDayAvailability({
      ...dayAvailability,
      [dayValue]: {
        ...dayAvailability[dayValue],
        enabled: !dayAvailability[dayValue].enabled,
      },
    });
  };

  const openTimePicker = (dayValue: number, field: "startTime" | "endTime") => {
    const currentTime = dayAvailability[dayValue][field];
    const [hour, minute] = currentTime.split(":").map(Number);
    setTempTime({ hour: hour || 9, minute: minute || 0 });
    setEditingDay(dayValue);
    setEditingField(field);
    setTimePickerVisible(true);
  };

  const confirmTimeSelection = () => {
    if (editingField) {
      const timeString = `${String(tempTime.hour).padStart(2, "0")}:${String(
        tempTime.minute
      ).padStart(2, "0")}`;

      if (editingDate) {
        // Update time for a specific date (non-repeating)
        setSelectedDates({
          ...selectedDates,
          [editingDate]: {
            ...selectedDates[editingDate],
            [editingField]: timeString,
          },
        });
        setEditingDate(null);
      } else if (editingDay !== null) {
        // Update time for a day of week (repeating)
        updateDayTime(editingDay, editingField, timeString);
      }
    }
    setTimePickerVisible(false);
    setEditingDay(null);
    setEditingField(null);
  };

  const updateDayTime = (
    dayValue: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setDayAvailability({
      ...dayAvailability,
      [dayValue]: {
        ...dayAvailability[dayValue],
        [field]: value,
      },
    });
  };

  const generateHours = () => {
    return Array.from({ length: 24 }, (_, i) => i);
  };

  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i);
  };

  // Calendar functions
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toggleDateSelection = (date: Date) => {
    const dateStr = formatDateString(date);
    const newDates = { ...selectedDates };

    if (newDates[dateStr]) {
      delete newDates[dateStr];
    } else {
      newDates[dateStr] = {
        startTime: "09:00",
        endTime: "18:00",
      };
    }

    setSelectedDates(newDates);
  };

  const isDateSelected = (date: Date): boolean => {
    const dateStr = formatDateString(date);
    return !!selectedDates[dateStr];
  };

  const generateCalendarDays = (): Date[] => {
    const today = new Date();
    const days: Date[] = [];
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Start from Sunday of current week

    // Generate 60 days (about 2 months)
    for (let i = 0; i < 60; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.title || !formData.address) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // At least one price field must be filled
    if (!formData.price_per_hour && !formData.price_per_day) {
      Alert.alert(
        "Error",
        "Please enter at least one price (per hour or per day)"
      );
      return;
    }

    if (formData.latitude === 0 || formData.longitude === 0) {
      Alert.alert("Error", "Please set the location");
      return;
    }

    // Validate max_vehicles
    const maxVehicles = parseInt(formData.max_vehicles, 10);
    if (isNaN(maxVehicles) || maxVehicles < 1) {
      Alert.alert("Error", "Maximum vehicles must be at least 1");
      return;
    }

    setLoading(true);
    try {
      let spaceData: any = {
        title: formData.title,
        description: formData.description || null,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        price_per_hour: formData.price_per_hour
          ? parseFloat(formData.price_per_hour)
          : null,
        price_per_day: formData.price_per_day
          ? parseFloat(formData.price_per_day)
          : null,
        max_vehicles: maxVehicles,
        repeating_weekly: formData.repeating,
      };

      if (formData.repeating) {
        // Repeating weekly schedule
        const enabledDays = Object.keys(dayAvailability)
          .map(Number)
          .filter((day) => dayAvailability[day].enabled);

        if (enabledDays.length === 0) {
          Alert.alert("Error", "Please select at least one available day");
          setLoading(false);
          return;
        }

        // Validate times for enabled days
        for (const day of enabledDays) {
          const dayData = dayAvailability[day];
          if (!dayData.startTime || !dayData.endTime) {
            Alert.alert(
              "Error",
              `Please set times for ${daysOfWeek[day].label}`
            );
            setLoading(false);
            return;
          }
        }

        // Build day_availability_schedule for repeating schedule
        const daySchedule: {
          [key: number]: { startTime: string; endTime: string };
        } = {};
        enabledDays.forEach((day) => {
          daySchedule[day] = {
            startTime: dayAvailability[day].startTime,
            endTime: dayAvailability[day].endTime,
          };
        });

        // Use first enabled day's time as main availability (for backward compatibility)
        const firstEnabledDay = enabledDays[0];
        const mainAvailability = dayAvailability[firstEnabledDay];

        spaceData.availability_start = mainAvailability.startTime || null;
        spaceData.availability_end = mainAvailability.endTime || null;
        spaceData.available_days = enabledDays;
        spaceData.day_availability_schedule = daySchedule;
      } else {
        // Non-repeating schedule - specific dates
        const dateKeys = Object.keys(selectedDates);
        if (dateKeys.length === 0) {
          Alert.alert("Error", "Please select at least one available date");
          setLoading(false);
          return;
        }

        // Validate times for selected dates
        for (const date of dateKeys) {
          const dateData = selectedDates[date];
          if (!dateData.startTime || !dateData.endTime) {
            Alert.alert("Error", `Please set times for ${date}`);
            setLoading(false);
            return;
          }
        }

        // Build day_availability_schedule for non-repeating schedule
        spaceData.day_availability_schedule = selectedDates;
        spaceData.available_days = null;
        spaceData.availability_start = null;
        spaceData.availability_end = null;
      }

      if (isEditMode && spaceId) {
        // Update existing space
        const { error } = await supabase
          .from("parking_spaces")
          .update(spaceData)
          .eq("id", spaceId);

        if (error) throw error;

        Alert.alert("Success", "Parking space updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Insert new space
        const { error } = await supabase.from("parking_spaces").insert([
          {
            ...spaceData,
            host_id: user.id,
            is_active: true,
          },
        ]);

        if (error) throw error;

        Alert.alert("Success", "Parking space added successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add parking space");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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

          <Text style={styles.label}>Location *</Text>
          <Text style={styles.instruction}>
            Tap on the map below to select the parking location
          </Text>

          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={
                userLocation
                  ? {
                      latitude: userLocation.coords.latitude,
                      longitude: userLocation.coords.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }
                  : {
                      latitude: 6.9271, // Default to Colombo, Sri Lanka
                      longitude: 79.8612,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }
              }
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton
            >
              {formData.latitude !== 0 && formData.longitude !== 0 && (
                <Marker
                  coordinate={{
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  }}
                  title="Selected Location"
                  pinColor="#007AFF"
                />
              )}
            </MapView>
            {locationLoading && (
              <View style={styles.mapLoadingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            )}
          </View>

          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[styles.input, styles.addressInput]}
            placeholder="Address will be filled automatically from map selection"
            value={formData.address}
            editable={true}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
          />

          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.locationButtonText}>
                Use Current Location
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>
            Price Per Hour (LKR){" "}
            <Text style={styles.optionalText}>(at least one required)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={formData.price_per_hour}
            onChangeText={(text) =>
              setFormData({ ...formData, price_per_hour: text })
            }
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>
            Price Per Day (LKR){" "}
            <Text style={styles.optionalText}>(at least one required)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={formData.price_per_day}
            onChangeText={(text) =>
              setFormData({ ...formData, price_per_day: text })
            }
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Maximum Vehicles *</Text>
          <Text style={styles.instruction}>
            How many vehicles can be parked in this space?
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2"
            value={formData.max_vehicles}
            onChangeText={(text) =>
              setFormData({ ...formData, max_vehicles: text })
            }
            keyboardType="number-pad"
          />

          <View style={styles.availabilitySection}>
            <View style={styles.availabilityHeader}>
              <Text style={styles.label}>Availability *</Text>
              <View style={styles.repeatToggle}>
                <Text style={styles.repeatLabel}>
                  {formData.repeating ? "Repeating Weekly" : "Specific Dates"}
                </Text>
                <Switch
                  value={formData.repeating}
                  onValueChange={(value) =>
                    setFormData({ ...formData, repeating: value })
                  }
                  trackColor={{ false: "#ddd", true: "#34C759" }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {formData.repeating ? (
              <>
                <Text style={styles.instruction}>
                  Select days and set times for each day
                </Text>

                {daysOfWeek.map((day) => {
                  const dayData = dayAvailability[day.value];
                  return (
                    <View key={day.value} style={styles.dayRow}>
                      <TouchableOpacity
                        style={[
                          styles.dayToggle,
                          dayData.enabled && styles.dayToggleActive,
                        ]}
                        onPress={() => toggleDay(day.value)}
                      >
                        <Text
                          style={[
                            styles.dayToggleText,
                            dayData.enabled && styles.dayToggleTextActive,
                          ]}
                        >
                          {day.short}
                        </Text>
                      </TouchableOpacity>

                      {dayData.enabled && (
                        <View style={styles.timeInputs}>
                          <View style={styles.timeInputContainer}>
                            <Text style={styles.timeLabel}>From</Text>
                            <TouchableOpacity
                              style={styles.timeButton}
                              onPress={() =>
                                openTimePicker(day.value, "startTime")
                              }
                            >
                              <Text style={styles.timeButtonText}>
                                {dayData.startTime || "09:00"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.timeInputContainer}>
                            <Text style={styles.timeLabel}>To</Text>
                            <TouchableOpacity
                              style={styles.timeButton}
                              onPress={() =>
                                openTimePicker(day.value, "endTime")
                              }
                            >
                              <Text style={styles.timeButtonText}>
                                {dayData.endTime || "18:00"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                <Text style={styles.instruction}>
                  Select specific dates and set times for each date
                </Text>

                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => setCalendarVisible(true)}
                >
                  <Text style={styles.calendarButtonText}>
                    Select Dates ({Object.keys(selectedDates).length} selected)
                  </Text>
                </TouchableOpacity>

                {Object.keys(selectedDates).length > 0 && (
                  <View style={styles.selectedDatesContainer}>
                    {Object.keys(selectedDates)
                      .sort()
                      .map((date) => {
                        const dateData = selectedDates[date];
                        return (
                          <View key={date} style={styles.dateItem}>
                            <View style={styles.dateItemHeader}>
                              <Text style={styles.dateItemDate}>{date}</Text>
                              <TouchableOpacity
                                style={styles.removeDateButton}
                                onPress={() => {
                                  const newDates = { ...selectedDates };
                                  delete newDates[date];
                                  setSelectedDates(newDates);
                                }}
                              >
                                <Text style={styles.removeDateButtonText}>
                                  ×
                                </Text>
                              </TouchableOpacity>
                            </View>
                            <View style={styles.dateTimeInputs}>
                              <View style={styles.timeInputContainer}>
                                <Text style={styles.timeLabel}>From</Text>
                                <TouchableOpacity
                                  style={styles.timeButton}
                                  onPress={() => {
                                    setEditingDate(date);
                                    const [hour, minute] = dateData.startTime
                                      .split(":")
                                      .map(Number);
                                    setTempTime({
                                      hour: hour || 9,
                                      minute: minute || 0,
                                    });
                                    setEditingField("startTime");
                                    setTimePickerVisible(true);
                                  }}
                                >
                                  <Text style={styles.timeButtonText}>
                                    {dateData.startTime || "09:00"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <View style={styles.timeInputContainer}>
                                <Text style={styles.timeLabel}>To</Text>
                                <TouchableOpacity
                                  style={styles.timeButton}
                                  onPress={() => {
                                    setEditingDate(date);
                                    const [hour, minute] = dateData.endTime
                                      .split(":")
                                      .map(Number);
                                    setTempTime({
                                      hour: hour || 18,
                                      minute: minute || 0,
                                    });
                                    setEditingField("endTime");
                                    setTimePickerVisible(true);
                                  }}
                                >
                                  <Text style={styles.timeButtonText}>
                                    {dateData.endTime || "18:00"}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                  </View>
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? "Update Parking Space" : "Add Parking Space"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select {editingField === "startTime" ? "Start" : "End"} Time
            </Text>

            <View style={styles.timePickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView style={styles.pickerScroll}>
                  {generateHours().map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        tempTime.hour === hour && styles.pickerItemSelected,
                      ]}
                      onPress={() => setTempTime({ ...tempTime, hour })}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempTime.hour === hour &&
                            styles.pickerItemTextSelected,
                        ]}
                      >
                        {String(hour).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView style={styles.pickerScroll}>
                  {generateMinutes()
                    .filter((min) => min % 5 === 0)
                    .map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.pickerItem,
                          tempTime.minute === minute &&
                            styles.pickerItemSelected,
                        ]}
                        onPress={() => setTempTime({ ...tempTime, minute })}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            tempTime.minute === minute &&
                              styles.pickerItemTextSelected,
                          ]}
                        >
                          {String(minute).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setTimePickerVisible(false);
                  setEditingDate(null);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmTimeSelection}
              >
                <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Dates</Text>
            <Text style={styles.calendarInstruction}>
              Tap dates to select/deselect. Selected dates:{" "}
              {Object.keys(selectedDates).length}
            </Text>

            <ScrollView style={styles.calendarScroll}>
              <View style={styles.calendarGrid}>
                <View style={styles.calendarHeader}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <Text key={day} style={styles.calendarHeaderDay}>
                        {day}
                      </Text>
                    )
                  )}
                </View>
                {generateCalendarDays().map((date, index) => {
                  const isSelected = isDateSelected(date);
                  const isToday =
                    formatDateString(date) === formatDateString(new Date());
                  const dayOfWeek = date.getDay();
                  const isFirstOfWeek = dayOfWeek === 0;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        isFirstOfWeek && styles.calendarDayFirst,
                        isSelected && styles.calendarDaySelected,
                        isToday && styles.calendarDayToday,
                      ]}
                      onPress={() => toggleDateSelection(date)}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          isToday && !isSelected && styles.calendarDayTextToday,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 50,
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
  instruction: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  addressInput: {
    backgroundColor: "#f0f0f0",
  },
  availabilitySection: {
    marginTop: 10,
    marginBottom: 10,
  },
  availabilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  repeatToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  repeatLabel: {
    fontSize: 14,
    color: "#666",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  dayToggle: {
    width: 60,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
  },
  dayToggleActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  dayToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  dayToggleTextActive: {
    color: "#fff",
  },
  timeInputs: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  timeButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  optionalText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#999",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  timePickerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    height: 200,
  },
  pickerColumn: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 10,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  pickerScroll: {
    flex: 1,
    width: "100%",
  },
  pickerItem: {
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: "#007AFF",
  },
  pickerItemText: {
    fontSize: 18,
    color: "#666",
  },
  pickerItemTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f0f0f0",
  },
  modalButtonConfirm: {
    backgroundColor: "#007AFF",
  },
  modalButtonTextCancel: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextConfirm: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  calendarButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  calendarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedDatesContainer: {
    marginTop: 10,
  },
  dateItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateItemDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeDateButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  removeDateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },
  dateTimeInputs: {
    flexDirection: "row",
    gap: 10,
  },
  calendarInstruction: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    textAlign: "center",
  },
  calendarScroll: {
    maxHeight: 400,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarHeader: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 5,
  },
  calendarHeaderDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    paddingVertical: 5,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  calendarDayFirst: {
    borderLeftWidth: 2,
    borderLeftColor: "#007AFF",
  },
  calendarDaySelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: "#34C759",
  },
  calendarDayText: {
    fontSize: 14,
    color: "#333",
  },
  calendarDayTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  calendarDayTextToday: {
    color: "#34C759",
    fontWeight: "600",
  },
});

export default AddSpaceScreen;
