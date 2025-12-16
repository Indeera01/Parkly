import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";
import {Ionicons} from "@expo/vector-icons";

// Screens
import LoginScreen from "../screens/LoginScreen";
import MapScreen from "../screens/MapScreen";
import SpaceDetailScreen from "../screens/SpaceDetailScreen";
import BookingsScreen from "../screens/BookingsScreen";
import AddSpaceScreen from "../screens/AddSpaceScreen";
import ManageListingsScreen from "../screens/ManageListingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SpaceDetail: { spaceId: string };
  AddSpace: undefined;
  EditSpace: { spaceId: string };
};

export type MainTabParamList = {
  Map: undefined;
  Bookings: undefined;
  Listings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: "Find Parking",
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          title: "My Bookings",
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Listings"
        component={ManageListingsScreen}
        options={{
          title: "My Listings",
          tabBarLabel: "Listings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="SpaceDetail"
              component={SpaceDetailScreen}
              options={{ headerShown: true, title: "Parking Space" }}
            />
            <Stack.Screen
              name="AddSpace"
              component={AddSpaceScreen}
              options={{ headerShown: true, title: "Add Parking Space" }}
            />
            <Stack.Screen
              name="EditSpace"
              component={AddSpaceScreen}
              options={{ headerShown: true, title: "Edit Parking Space" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
