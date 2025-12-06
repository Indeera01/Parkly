CS4473 Mobile Computing
Project Proposal
Parkly
A mobile application for sharing and booking
private parking spaces in urban areas

The Problem
In many urban areas, especially near hospitals, schools, offices, and shopping
centers, finding parking is a major challenge. Drivers waste significant time
searching for free spots, leading to,
● Traffic congestion caused by vehicles circling for parking.
● Wasted fuel and time.
● Frustration for both drivers and residents.
● Underutilization of private spaces that remain empty (e.g., house
driveways, shop lots).
The problem becomes even worse during major events such as musical
concerts, exhibitions, or sports matches, where the sudden surge of vehicles
makes it nearly impossible to find nearby parking.
Additionally, if someone wants to temporarily offer their home driveway, shop
front, or private land for parking during such events, there is currently no quick
and structured way to list and share it with drivers who are searching for a spot.
At present, there is no platform that connects people with spare parking
spaces(whether permanent or temporary) to drivers in need.

Proposed Solution
We propose Parkly, a mobile application that enables:
● Hosts (space owners): To list their available parking spots with price,
availability schedule, and photos(optional).
● Drivers (users): To find, reserve, and pay for nearby parking spaces on an
hourly or daily basis.
This solution will:
● Reduce time wasted searching for parking.
● Provide an additional income stream for residents and businesses.
● Optimize usage of urban spaces.
Core Features
● Map-based search for nearby parking spots and directions.
● Availability and price per hour/day.
● Booking and reservation system.
● Payment integration (Later).
● Notifications for booking confirmation and time reminders.

High-Level Architecture
System Boundaries
● Users (Drivers) - search and book spots.
● Hosts (Space Owners) - list and manage parking availability.
(eventhough there are two user types any user can book or list)
● Backend System - manages data, bookings, and payments(not required for now).
● External APIs - Google Maps API for location and directions, Payment(not required for now).
Gateway for transactions.

UIs

1. Login UI
2. Map UI with locations marked (should be able to search)
3. Space Full view (once selected from the map)
4. Booked Spaces management view (to edit or cacel bookings)
5. Add a new space view
6. manage Listed spaces view (to edit or remove a listing)

List of Deliverables
Mobile Application (MVP):
○ Hosts can list parking spots with location, availability, and pricing.
○ Drivers can search and view nearby parking spaces on a map.
○ Booking system (select time & confirm reservation).
Backend System (APIs):
○ Parking spot management.
○ Notifications (basic alerts).
Database:
○ Structured schema for users, spots, and bookings.
