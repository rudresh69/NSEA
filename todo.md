# Neuro Smart Emission Assistant - Project TODO

## Database & Backend
- [x] Create database schema for User, Vehicle, EmissionReading, and Alert models
- [x] Implement authentication endpoints (login, register)
- [x] Implement IoT data ingestion endpoint for emission readings
- [x] Implement dashboard endpoints for vehicle status and history
- [ ] Implement admin endpoints for global stats and alerts
- [ ] Implement ML prediction endpoint (mock)
- [x] Add threshold analysis logic for emission limits

## Frontend - Authentication Pages
- [x] Create Login page with email/password form and user/admin toggle
- [x] Create Register page for new vehicle owners

## Frontend - User Dashboard
- [x] Create User Dashboard layout at /dashboard
- [x] Implement VehicleSelector component (dropdown)
- [x] Implement ComplianceStatus component (green/red card)
- [x] Implement RealTimeGauges component (CO2, CO, NOx, PM)
- [x] Implement EmissionHistoryChart component (time-series)
- [x] Implement DigitalCertificate component with download button
- [x] Add vehicle filter functionality

## Frontend - Admin Dashboard
- [x] Create Admin Dashboard layout at /admin/overview
- [x] Implement GlobalStats component (KPI cards)
- [x] Implement LiveAlertsTable component (real-time alerts)
- [ ] Implement PollutionHotspotMap component (Leaflet map)

## Frontend - Vehicle Management
- [x] Create Vehicle Management page at /my-vehicles
- [x] Implement add/edit/remove vehicle functionality
- [x] Add form fields for make, model, fuel type, device ID

## Frontend - Design & Styling
- [ ] Set up Eco-Tech color palette (blue, green, red/amber)
- [ ] Create responsive sidebar-and-content layout
- [ ] Implement data visualization components (charts, gauges)
- [ ] Ensure mobile responsiveness

## Integration & Testing
- [x] Wire frontend components to backend APIs
- [x] Test authentication flow
- [ ] Fix undefined query data errors in emissions and alerts endpoints
- [ ] Test data ingestion and threshold detection
- [ ] Test dashboard data display and filtering
- [ ] Test admin features and alerts

## Documentation
- [ ] Create userGuide.md with usage instructions
- [ ] Document API endpoints
- [ ] Add deployment instructions
