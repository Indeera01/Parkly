import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
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

  // Booking date and time state
  const [bookingDate, setBookingDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 18, minute: 0 });
  const [vehicleCount, setVehicleCount] = useState("1");
  const [availableCapacity, setAvailableCapacity] = useState<number | null>(
    null
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Time picker modal state
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingField, setEditingField] = useState<
    "startTime" | "endTime" | null
  >(null);
  const [tempTime, setTempTime] = useState({ hour: 9, minute: 0 });

  useEffect(() => {
    fetchSpaceDetails();
  }, [spaceId]);

  // Check availability when date or time changes
  useEffect(() => {
    if (space) {
      checkAvailability();
    }
  }, [bookingDate, startTime, endTime, space]);

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

  const generateHours = () => {
    return Array.from({ length: 24 }, (_, i) => i);
  };

  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i);
  };

  const openTimePicker = (field: "startTime" | "endTime") => {
    const currentTime = field === "startTime" ? startTime : endTime;
    setTempTime({ hour: currentTime.hour, minute: currentTime.minute });
    setEditingField(field);
    setTimePickerVisible(true);
  };

  const confirmTimeSelection = () => {
    if (editingField) {
      if (editingField === "startTime") {
        setStartTime({ ...tempTime });
      } else {
        setEndTime({ ...tempTime });
      }
    }
    setTimePickerVisible(false);
    setEditingField(null);
  };

  const formatTime = (time: { hour: number; minute: number }) => {
    return `${String(time.hour).padStart(2, "0")}:${String(
      time.minute
    ).padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const checkAvailability = async () => {
    if (!space) return;

    setCheckingAvailability(true);
    try {
      // Combine date and time for start and end
      const startDateTime = new Date(bookingDate);
      startDateTime.setHours(startTime.hour, startTime.minute, 0, 0);

      const endDateTime = new Date(bookingDate);
      endDateTime.setHours(endTime.hour, endTime.minute, 0, 0);

      // If end time is before start time, assume it's the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      // Check available capacity using the database function
      const { data, error } = await supabase.rpc(
        "get_available_vehicle_capacity",
        {
          p_space_id: space.id,
          p_start_time: startDateTime.toISOString(),
          p_end_time: endDateTime.toISOString(),
        }
      );

      if (error) {
        console.error("Availability check error:", error);
        // Fallback to max_vehicles if function fails
        setAvailableCapacity(space.max_vehicles || 1);
      } else {
        setAvailableCapacity(data || space.max_vehicles || 1);

        // Adjust vehicle count if it exceeds available capacity
        const currentCount = parseInt(vehicleCount, 10) || 1;
        if (currentCount > (data || space.max_vehicles || 1)) {
          setVehicleCount(String(data || space.max_vehicles || 1));
        }
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailableCapacity(space.max_vehicles || 1);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleBooking = async () => {
    if (!user || !space) return;

    // Validate times
    const startTotalMinutes = startTime.hour * 60 + startTime.minute;
    const endTotalMinutes = endTime.hour * 60 + endTime.minute;

    if (endTotalMinutes <= startTotalMinutes) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    // Validate vehicle count
    const requestedVehicles = parseInt(vehicleCount, 10);
    if (isNaN(requestedVehicles) || requestedVehicles < 1) {
      Alert.alert("Error", "Number of vehicles must be at least 1");
      return;
    }

    // Use available capacity if checked, otherwise fallback to max_vehicles
    const maxAvailable =
      availableCapacity !== null ? availableCapacity : space.max_vehicles || 1;

    if (requestedVehicles > maxAvailable) {
      Alert.alert(
        "Not Available",
        `Only ${maxAvailable} vehicle slot(s) available for this time period. Please select a different time or reduce the number of vehicles.`
      );
      return;
    }

    setBookingLoading(true);
    try {
      // Combine date and time for start and end
      const startDateTime = new Date(bookingDate);
      startDateTime.setHours(startTime.hour, startTime.minute, 0, 0);

      const endDateTime = new Date(bookingDate);
      endDateTime.setHours(endTime.hour, endTime.minute, 0, 0);

      // If end time is before start time, assume it's the next day
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const hours =
        (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      const days = hours / 24;

      // Calculate price based on available pricing options
      let totalPrice = 0;
      if (space.price_per_day && days >= 1) {
        // Use daily rate if booking is for a day or more
        totalPrice = Math.ceil(days) * space.price_per_day;
      } else if (space.price_per_hour) {
        // Use hourly rate
        totalPrice = hours * space.price_per_hour;
      } else if (space.price_per_day) {
        // Fallback to daily rate even for partial days
        totalPrice = Math.ceil(days) * space.price_per_day;
      } else {
        throw new Error("No pricing information available for this space");
      }

      // Final availability check (double-check before booking)
      const { data: finalAvailability, error: availabilityError } =
        await supabase.rpc("get_available_vehicle_capacity", {
          p_space_id: space.id,
          p_start_time: startDateTime.toISOString(),
          p_end_time: endDateTime.toISOString(),
        });

      if (availabilityError) {
        console.error("Final availability check error:", availabilityError);
      }

      const finalAvailable =
        finalAvailability !== null
          ? finalAvailability
          : space.max_vehicles || 1;

      if (requestedVehicles > finalAvailable) {
        Alert.alert(
          "Not Available",
          `Only ${finalAvailable} vehicle slot(s) available for this time period. The availability may have changed. Please try again.`
        );
        // Refresh availability
        await checkAvailability();
        return;
      }

      const { error } = await supabase.from("bookings").insert([
        {
          user_id: user.id,
          space_id: space.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          vehicle_count: requestedVehicles,
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
          {space.price_per_hour && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Per Hour</Text>
              <Text style={styles.priceValue}>LKR {space.price_per_hour}</Text>
            </View>
          )}
          {space.price_per_day && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Per Day</Text>
              <Text style={styles.priceValue}>LKR {space.price_per_day}</Text>
            </View>
          )}
        </View>

        <View style={styles.availabilityContainer}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {space.available_days && space.available_days.length > 0 ? (
            <>
              {space.repeating_weekly !== false && (
                <Text style={styles.repeatingText}>Repeats Weekly</Text>
              )}
              <View style={styles.daysContainer}>
                {space.available_days.map((dayNum) => {
                  const daysOfWeek = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ];
                  const dayName = daysOfWeek[dayNum];
                  // Check if we have per-day schedule, otherwise use main availability
                  const daySchedule = space.day_availability_schedule?.[dayNum];
                  const startTime =
                    daySchedule?.startTime || space.availability_start || "N/A";
                  const endTime =
                    daySchedule?.endTime || space.availability_end || "N/A";

                  return (
                    <View key={dayNum} style={styles.dayItem}>
                      <Text style={styles.dayName}>{dayName}</Text>
                      <Text style={styles.dayTime}>
                        {startTime} - {endTime}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : space.availability_start && space.availability_end ? (
            <Text style={styles.availabilityText}>
              {space.availability_start} - {space.availability_end}
            </Text>
          ) : (
            <Text style={styles.availabilityText}>Not specified</Text>
          )}
        </View>

        <View style={styles.bookingContainer}>
          <Text style={styles.sectionTitle}>Book This Space</Text>

          {/* Date Selection */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Booking Date</Text>
            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  const newDate = new Date(bookingDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setBookingDate(newDate);
                }}
              >
                <Text style={styles.dateButtonText}>←</Text>
              </TouchableOpacity>
              <View style={styles.dateDisplay}>
                <Text style={styles.dateText}>{formatDate(bookingDate)}</Text>
                <Text style={styles.dateDayText}>
                  {bookingDate.toLocaleDateString("en-US", { weekday: "long" })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  const newDate = new Date(bookingDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setBookingDate(newDate);
                }}
              >
                <Text style={styles.dateButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Selection */}
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Time</Text>
            <View style={styles.timeInputs}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeSubLabel}>From</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker("startTime")}
                >
                  <Text style={styles.timeButtonText}>
                    {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeSubLabel}>To</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => openTimePicker("endTime")}
                >
                  <Text style={styles.timeButtonText}>
                    {formatTime(endTime)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Vehicle Count Selection */}
          <View style={styles.vehicleSection}>
            <Text style={styles.vehicleLabel}>Number of Vehicles</Text>
            {checkingAvailability ? (
              <View style={styles.availabilityChecking}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.vehicleSubLabel}>
                  Checking availability...
                </Text>
              </View>
            ) : availableCapacity !== null ? (
              <Text style={styles.vehicleSubLabel}>
                Available: {availableCapacity} of {space.max_vehicles || 1}{" "}
                vehicle(s)
                {availableCapacity === 0 && (
                  <Text style={styles.unavailableText}> - Fully booked</Text>
                )}
              </Text>
            ) : (
              <Text style={styles.vehicleSubLabel}>
                Maximum: {space.max_vehicles || 1} vehicle(s)
              </Text>
            )}
            <View style={styles.vehicleInputContainer}>
              <TouchableOpacity
                style={[
                  styles.vehicleButton,
                  (parseInt(vehicleCount, 10) || 1) <= 1 &&
                    styles.vehicleButtonDisabled,
                ]}
                onPress={() => {
                  const current = parseInt(vehicleCount, 10) || 1;
                  if (current > 1) {
                    setVehicleCount(String(current - 1));
                  }
                }}
                disabled={
                  parseInt(vehicleCount, 10) <= 1 || checkingAvailability
                }
              >
                <Text
                  style={[
                    styles.vehicleButtonText,
                    (parseInt(vehicleCount, 10) || 1) <= 1 &&
                      styles.vehicleButtonTextDisabled,
                  ]}
                >
                  −
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.vehicleInput}
                value={vehicleCount}
                onChangeText={(text: string) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1) {
                    const max =
                      availableCapacity !== null
                        ? availableCapacity
                        : space.max_vehicles || 1;
                    setVehicleCount(String(Math.min(num, max)));
                  } else if (text === "") {
                    setVehicleCount("");
                  }
                }}
                keyboardType="number-pad"
                textAlign="center"
                editable={
                  !checkingAvailability &&
                  (availableCapacity === null || availableCapacity > 0)
                }
              />
              <TouchableOpacity
                style={[
                  styles.vehicleButton,
                  (parseInt(vehicleCount, 10) || 1) >=
                    (availableCapacity !== null
                      ? availableCapacity
                      : space.max_vehicles || 1) &&
                    styles.vehicleButtonDisabled,
                ]}
                onPress={() => {
                  const current = parseInt(vehicleCount, 10) || 1;
                  const max =
                    availableCapacity !== null
                      ? availableCapacity
                      : space.max_vehicles || 1;
                  if (current < max) {
                    setVehicleCount(String(current + 1));
                  }
                }}
                disabled={
                  (parseInt(vehicleCount, 10) || 1) >=
                    (availableCapacity !== null
                      ? availableCapacity
                      : space.max_vehicles || 1) || checkingAvailability
                }
              >
                <Text
                  style={[
                    styles.vehicleButtonText,
                    (parseInt(vehicleCount, 10) || 1) >=
                      (availableCapacity !== null
                        ? availableCapacity
                        : space.max_vehicles || 1) &&
                      styles.vehicleButtonTextDisabled,
                  ]}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
                onPress={() => setTimePickerVisible(false)}
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
  repeatingText: {
    fontSize: 14,
    color: "#007AFF",
    fontStyle: "italic",
    marginBottom: 8,
  },
  daysContainer: {
    marginTop: 8,
  },
  dayItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    marginBottom: 6,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  dayTime: {
    fontSize: 14,
    color: "#666",
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
  dateSection: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dateDayText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  vehicleSection: {
    marginBottom: 20,
  },
  vehicleLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  vehicleSubLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  unavailableText: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  availabilityChecking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  vehicleInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  vehicleButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleButtonDisabled: {
    backgroundColor: "#ddd",
  },
  vehicleButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  vehicleButtonTextDisabled: {
    color: "#999",
  },
  vehicleInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: "600",
    width: 80,
    backgroundColor: "#fff",
  },
  timeSection: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  timeInputs: {
    flexDirection: "row",
    gap: 10,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeSubLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
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
  // Time Picker Modal Styles
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  timePickerContainer: {
    flexDirection: "row",
    height: 200,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  pickerScroll: {
    flex: 1,
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
    fontSize: 16,
    color: "#333",
  },
  pickerItemTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
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
    fontWeight: "600",
  },
  modalButtonTextConfirm: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default SpaceDetailScreen;
