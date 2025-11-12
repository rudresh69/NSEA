# Neuro Smart Emission Assistant - User Guide

## Overview

The **Neuro Smart Emission Assistant** is a real-time vehicle emission monitoring platform that helps vehicle owners and regulatory authorities track vehicle emissions, ensure compliance with environmental standards, and receive instant alerts for non-compliant readings.

**Purpose:** Monitor your vehicle's emissions in real-time, track compliance status against CPCB and WHO standards, and generate daily digital PUC certificates.

**Access:** Login required for users and administrators. Public access available for IoT data ingestion endpoints.

---

## Powered by Manus

This application is built with a modern, cutting-edge technology stack:

- **Frontend:** React 19 with TypeScript, Tailwind CSS 4, and shadcn/ui components for a responsive, accessible user interface
- **Backend:** Express.js with tRPC for type-safe API communication and real-time data handling
- **Database:** MySQL with Drizzle ORM for efficient data management and migrations
- **Authentication:** Manus OAuth integration for secure user authentication
- **Deployment:** Auto-scaling infrastructure with global CDN for reliable, fast performance worldwide

---

## Using Your Website

### For Vehicle Owners

**1. Register Your Vehicle**

Navigate to "Manage Vehicles" and click "Add New Vehicle". Fill in your vehicle details:
- **Vehicle Make:** Enter your vehicle's manufacturer (e.g., Maruti, Hyundai)
- **Vehicle Model:** Enter the specific model name
- **Fuel Type:** Select from Petrol, Diesel, CNG, LPG, Electric, or Hybrid
- **IoT Device ID:** Enter your vehicle's emission monitoring device ID

Click "Add Vehicle" to register. Your vehicle is now ready for emission monitoring.

**2. Monitor Real-Time Emissions**

Go to "Vehicle Dashboard" and select your vehicle from the dropdown. The dashboard displays:
- **Compliance Status:** Green "COMPLIANT" or red "NON-COMPLIANT" indicator
- **Real-Time Readings:** Current levels for CO₂, CO, NOx, and PM in large gauge cards
- **24-Hour History:** Line chart showing emission trends over the last 24 hours
- **Active Alerts:** List of any emission readings exceeding limits

**3. Download Digital PUC Certificate**

If your vehicle is compliant, click "Download Certificate" in the Digital PUC Certificate section. This generates a daily compliance certificate for your records.

### For Administrators (RTO Officials)

**1. Access Admin Dashboard**

Click "View Admin Dashboard" from the home page. The admin dashboard provides:
- **Global Statistics:** Total vehicles monitored, non-compliant count, and overall compliance rate
- **Live Alerts Table:** Real-time list of all vehicles exceeding emission limits with details
- **Vehicles Overview:** Summary cards showing compliance status for each registered vehicle

**2. Monitor Active Alerts**

The "Live Emission Alerts" table shows all current violations with:
- Vehicle ID and gas type (CO₂, CO, NOx, PM)
- Measured value and permissible limit
- Timestamp of the violation
- Alert status (Active/Resolved)

**3. Identify Non-Compliant Vehicles**

Red-highlighted vehicle cards indicate non-compliance. Click on any vehicle to see specific alert details and take enforcement action.

---

## Managing Your Website

### Settings & Configuration

Access the **Management UI** (right panel) to:

- **General Settings:** Update your website title and logo
- **Database Panel:** View and manage vehicle, emission reading, and alert records directly
- **Secrets Panel:** Manage API keys and environment variables securely
- **Domains Panel:** Configure your custom domain or use the auto-generated Manus domain

### Monitoring & Analytics

Use the **Dashboard Panel** to:
- Monitor website uptime and performance
- View analytics on user visits and page views
- Check deployment status and health metrics

### Database Management

The **Database Panel** allows you to:
- View all users, vehicles, emission readings, and alerts
- Add or edit records directly
- Query data for compliance reporting

---

## Next Steps

Talk to Manus AI anytime to request changes or add features to your emission monitoring system.

**Popular requests:**
- Add Leaflet map visualization for pollution hotspots
- Implement SMS/Email alerts for non-compliant vehicles
- Create mobile app for iOS and Android
- Add predictive ML models for emission forecasting
- Integrate with government RTO/Parivahan systems

Start by registering your first vehicle in "Manage Vehicles" and monitoring its emissions in real-time on the Vehicle Dashboard!
