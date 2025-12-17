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

  // Initialize date and time based on availability when space loads
  useEffect(() => {
    if (space) {
      const nextAvailableDate = getNextAvailableDate(new Date());
      if (nextAvailableDate) {
        setBookingDate(nextAvailableDate);
        const timeRange = getAvailableTimeRangeForDate(nextAvailableDate);
        if (timeRange) {
          setStartTime(timeRange.start);
          setEndTime(timeRange.end);
        }
        // Trigger availability check after state updates
        // Use a small delay to ensure state is updated
        const timer = setTimeout(() => {
          checkAvailability();
        }, 50);
        return () => clearTimeout(timer);
      } else {
        // Even if no available date, check with current date/time
        const timer = setTimeout(() => {
          checkAvailability();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [space]);

  // Check availability when date or time changes, or when space loads
  useEffect(() => {
    if (space && bookingDate && startTime && endTime) {
      // Only check if we have valid date and time values
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

  // Format date as YYYY-MM-DD string
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (!space) return false;

    const dateStr = formatDateString(date);
    const dayOfWeek = date.getDay();

    // Check if space is repeating weekly
    const isRepeating = space.repeating_weekly !== false;

    if (isRepeating) {
      // For repeating schedules, check day_availability_schedule by day of week
      if (space.day_availability_schedule) {
        // Check if day of week exists in schedule
        return !!space.day_availability_schedule[dayOfWeek];
      }
      // Fallback to available_days
      if (space.available_days && space.available_days.length > 0) {
        return space.available_days.includes(dayOfWeek);
      }
      return false;
    } else {
      // For non-repeating schedules, check if specific date exists in day_availability_schedule
      if (space.day_availability_schedule) {
        return !!space.day_availability_schedule[dateStr];
      }
      return false;
    }
  };

  // Get the next available date starting from a given date
  const getNextAvailableDate = (startDate: Date): Date | null => {
    if (!space) return null;

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const isRepeating = space.repeating_weekly !== false;
    const maxDays = isRepeating ? 30 : 365; // Check further ahead for non-repeating

    // Check up to maxDays ahead
    for (let i = 0; i < maxDays; i++) {
      if (isDateAvailable(currentDate)) {
        return new Date(currentDate);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  };

  // Get the previous available date before a given date
  const getPreviousAvailableDate = (startDate: Date): Date | null => {
    if (!space) return null;

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    currentDate.setDate(currentDate.getDate() - 1);

    // Check up to 30 days back, but not before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isRepeating = space.repeating_weekly !== false;
    const maxDays = isRepeating ? 30 : 365; // Check further back for non-repeating

    for (let i = 0; i < maxDays; i++) {
      if (currentDate < today) {
        return null;
      }
      if (isDateAvailable(currentDate)) {
        return new Date(currentDate);
      }
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return null;
  };

  // Get available time range for a specific date
  const getAvailableTimeRangeForDate = (
    date: Date
  ): {
    start: { hour: number; minute: number };
    end: { hour: number; minute: number };
  } | null => {
    if (!space) return null;

    const dateStr = formatDateString(date);
    const dayOfWeek = date.getDay();
    const isRepeating = space.repeating_weekly !== false;

    if (isRepeating) {
      // For repeating schedules, check day_availability_schedule by day of week
      if (
        space.day_availability_schedule &&
        space.day_availability_schedule[dayOfWeek]
      ) {
        const schedule = space.day_availability_schedule[dayOfWeek];
        return {
          start: parseTime(schedule.startTime),
          end: parseTime(schedule.endTime),
        };
      }

      // Fallback to default availability times
      if (space.availability_start && space.availability_end) {
        return {
          start: parseTime(space.availability_start),
          end: parseTime(space.availability_end),
        };
      }
    } else {
      // For non-repeating schedules, check specific date in day_availability_schedule
      if (
        space.day_availability_schedule &&
        space.day_availability_schedule[dateStr]
      ) {
        const schedule = space.day_availability_schedule[dateStr];
        return {
          start: parseTime(schedule.startTime),
          end: parseTime(schedule.endTime),
        };
      }
    }

    // Default to 24 hours if no specific times found
    return {
      start: { hour: 0, minute: 0 },
      end: { hour: 23, minute: 59 },
    };
  };

  // Parse time string (HH:MM) to hour and minute object
  const parseTime = (timeStr: string): { hour: number; minute: number } => {
    const [hourStr, minuteStr] = timeStr.split(":");
    return {
      hour: parseInt(hourStr, 10) || 0,
      minute: parseInt(minuteStr, 10) || 0,
    };
  };

  // Get available hours for the selected date and field (start or end)
  const getAvailableHours = (field: "startTime" | "endTime"): number[] => {
    const timeRange = getAvailableTimeRangeForDate(bookingDate);
    if (!timeRange) return Array.from({ length: 24 }, (_, i) => i);

    const { start, end } = timeRange;
    const hours: number[] = [];

    if (field === "startTime") {
      // Start time can be from availability start to before end
      for (let h = start.hour; h <= end.hour; h++) {
        hours.push(h);
      }
    } else {
      // End time should be after start time
      const startHour = startTime.hour;
      for (let h = Math.max(startHour, start.hour); h <= end.hour; h++) {
        if (h > startHour || (h === startHour && start.minute < 60)) {
          hours.push(h);
        }
      }
    }

    return hours;
  };

  // Get available minutes for selected hour
  const getAvailableMinutes = (
    hour: number,
    field: "startTime" | "endTime"
  ): number[] => {
    const timeRange = getAvailableTimeRangeForDate(bookingDate);
    if (!timeRange) return Array.from({ length: 12 }, (_, i) => i * 5);

    const { start, end } = timeRange;
    const minutes: number[] = [];

    for (let m = 0; m < 60; m += 5) {
      if (field === "startTime") {
        // For start time, check against availability start
        if (hour > start.hour || (hour === start.hour && m >= start.minute)) {
          if (hour < end.hour || (hour === end.hour && m < end.minute)) {
            minutes.push(m);
          }
        }
      } else {
        // For end time, check against start time
        if (
          hour > startTime.hour ||
          (hour === startTime.hour && m > startTime.minute)
        ) {
          if (hour < end.hour || (hour === end.hour && m <= end.minute)) {
            minutes.push(m);
          }
        }
      }
    }

    return minutes;
  };

  const generateHours = () => {
    return getAvailableHours(editingField || "startTime");
  };

  const generateMinutes = () => {
    return getAvailableMinutes(tempTime.hour, editingField || "startTime");
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
        // Adjust end time if it's now invalid
        const endTotalMinutes = endTime.hour * 60 + endTime.minute;
        const newStartTotalMinutes = tempTime.hour * 60 + tempTime.minute;
        if (endTotalMinutes <= newStartTotalMinutes) {
          // Set end time to 1 hour after start time
          const newEndHour = tempTime.hour + 1;
          setEndTime({
            hour: Math.min(newEndHour, 23),
            minute: tempTime.minute,
          });
        }
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
    return formatDateString(date);
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

  const handleDateChange = (direction: "prev" | "next") => {
    if (direction === "next") {
      const nextDate = getNextAvailableDate(
        new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000)
      );
      if (nextDate) {
        setBookingDate(nextDate);
        // Update times to match new date's availability
        const timeRange = getAvailableTimeRangeForDate(nextDate);
        if (timeRange) {
          setStartTime(timeRange.start);
          setEndTime(timeRange.end);
        }
      } else {
        Alert.alert("Notice", "No available dates found in the next 30 days");
      }
    } else {
      const prevDate = getPreviousAvailableDate(bookingDate);
      if (prevDate) {
        setBookingDate(prevDate);
        // Update times to match new date's availability
        const timeRange = getAvailableTimeRangeForDate(prevDate);
        if (timeRange) {
          setStartTime(timeRange.start);
          setEndTime(timeRange.end);
        }
      } else {
        Alert.alert("Notice", "No available dates found before this date");
      }
    }
  };

  const handleBooking = async () => {
    if (!user || !space) return;

    // Check if date is available
    if (!isDateAvailable(bookingDate)) {
      Alert.alert("Error", "This date is not available for booking");
      return;
    }

    // Validate times
    const startTotalMinutes = startTime.hour * 60 + startTime.minute;
    const endTotalMinutes = endTime.hour * 60 + endTime.minute;

    if (endTotalMinutes <= startTotalMinutes) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    // Validate against available time range
    const timeRange = getAvailableTimeRangeForDate(bookingDate);
    if (timeRange) {
      const availStartMinutes =
        timeRange.start.hour * 60 + timeRange.start.minute;
      const availEndMinutes = timeRange.end.hour * 60 + timeRange.end.minute;

      if (
        startTotalMinutes < availStartMinutes ||
        endTotalMinutes > availEndMinutes
      ) {
        Alert.alert(
          "Error",
          `Booking time must be within available hours: ${formatTime(
            timeRange.start
          )} - ${formatTime(timeRange.end)}`
        );
        return;
      }
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
          {space.repeating_weekly !== false ? (
            <>
              <Text style={styles.repeatingText}>Repeats Weekly</Text>
              {space.day_availability_schedule ? (
                <View style={styles.daysContainer}>
                  {Object.keys(space.day_availability_schedule)
                    .map(Number)
                    .filter(
                      (dayNum) => !isNaN(dayNum) && dayNum >= 0 && dayNum <= 6
                    )
                    .sort((a, b) => a - b)
                    .map((dayNum) => {
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
                      const daySchedule =
                        space.day_availability_schedule?.[dayNum];
                      const startTime = daySchedule?.startTime || "N/A";
                      const endTime = daySchedule?.endTime || "N/A";

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
              ) : space.available_days && space.available_days.length > 0 ? (
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
                    const startTime = space.availability_start || "N/A";
                    const endTime = space.availability_end || "N/A";

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
              ) : (
                <Text style={styles.availabilityText}>Not specified</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.repeatingText}>Specific Dates</Text>
              {space.day_availability_schedule ? (
                <View style={styles.daysContainer}>
                  {Object.keys(space.day_availability_schedule)
                    .filter((dateKey) => dateKey.match(/^\d{4}-\d{2}-\d{2}$/))
                    .sort()
                    .map((dateKey) => {
                      const dateSchedule =
                        space.day_availability_schedule?.[dateKey];
                      const startTime = dateSchedule?.startTime || "N/A";
                      const endTime = dateSchedule?.endTime || "N/A";

                      return (
                        <View key={dateKey} style={styles.dayItem}>
                          <Text style={styles.dayName}>{dateKey}</Text>
                          <Text style={styles.dayTime}>
                            {startTime} - {endTime}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              ) : (
                <Text style={styles.availabilityText}>No dates specified</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.bookingContainer}>
          <Text style={styles.sectionTitle}>Book This Space</Text>

          {/* Date Selection */}
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Booking Date</Text>
            {!isDateAvailable(bookingDate) && (
              <Text style={styles.warningText}>
                This day is not available. Use arrows to find available dates.
              </Text>
            )}
            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => handleDateChange("prev")}
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
                onPress={() => handleDateChange("next")}
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
                      onPress={() => {
                        setTempTime({ ...tempTime, hour });
                        // Reset minute if current minute is not available for new hour
                        const availableMinutes = getAvailableMinutes(
                          hour,
                          editingField || "startTime"
                        );
                        if (!availableMinutes.includes(tempTime.minute)) {
                          setTempTime({
                            hour,
                            minute: availableMinutes[0] || 0,
                          });
                        }
                      }}
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
                  {generateMinutes().map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.pickerItem,
                        tempTime.minute === minute && styles.pickerItemSelected,
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
  warningText: {
    fontSize: 12,
    color: "#FF3B30",
    marginBottom: 8,
    fontStyle: "italic",
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
