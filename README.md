# TransitOps

TransitOps is a smart transport operations platform built as a hackathon prototype. It helps a transport team manage fleet availability, drivers, trip dispatching, maintenance, fuel expenses, analytics, role-based access, and basic app settings from one React dashboard.

## Features

- Authentication with Supabase Auth
- Role-aware navigation for Fleet Manager, Dispatcher, Safety Officer, and Financial Analyst
- Dashboard with live KPIs, recent trips, and vehicle status breakdown
- Vehicle registry with status management
- Driver and safety profile management
- Trip dispatcher with capacity validation, dispatch, complete, and cancel flows
- Maintenance service log
- Fuel and expense management
- Reports and analytics with charts and CSV export
- Settings and RBAC matrix screen
- Dark and light mode with saved user preference
- Responsive, modern dashboard UI using Tailwind CSS

## Tech Stack

- React 19
- Vite
- Tailwind CSS v4
- React Router
- Supabase
- Recharts
- ESLint

## Project Structure

```txt
Mighty-Galaxy/
  README.md
  client/
    package.json
    vite.config.js
    src/
      App.jsx
      main.jsx
      index.css
      components/
        AppLayout.jsx
      context/
        AuthContext.jsx
        ThemeContext.jsx
        useAuth.js
        useTheme.js
      lib/
        supabase.js
        permissions.js
        statusStyles.js
      pages/
        Login.jsx
        Dashboard.jsx
        VehicleRegistry.jsx
        Drivers.jsx
        TripDispatcher.jsx
        Maintenance.jsx
        FuelExpenses.jsx
        Analytics.jsx
        Settings.jsx
```

## Getting Started

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Supabase

Create a `.env` file inside `client/`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The Supabase client is configured in:

```txt
client/src/lib/supabase.js
```

### 3. Run The App

```bash
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Available Scripts

Run these from the `client/` directory:

```bash
npm run dev
```

Starts the development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Runs ESLint checks.

## Supabase Tables

The app expects these main tables:

- `profiles`
- `vehicles`
- `drivers`
- `trips`
- `maintenance_logs`
- `fuel_logs`
- `expenses`

This prototype assumes Row Level Security is disabled for demo speed. Do not use that setup unchanged in production.

## Core Screens

### Login

Users can sign in or sign up with a selected role. After login, they are redirected to the dashboard.

### Dashboard

Shows live operational KPIs:

- Active vehicles
- Available vehicles
- Vehicles in maintenance
- Active trips
- Pending trips
- Drivers on duty
- Fleet utilization

### Vehicle Registry

Manage vehicle records and update vehicle statuses such as Available, On Trip, In Shop, and Retired.

### Drivers

Manage driver profiles, license details, safety score, and driver availability.

### Trip Dispatcher

Create and manage trips. The dispatcher includes:

- Available vehicle filtering
- Available and non-expired driver filtering
- Cargo capacity validation
- Draft to dispatched flow
- Complete trip flow with odometer and fuel entry
- Cancel trip flow

### Maintenance

Create and close service records. Active maintenance can move vehicles into the In Shop state.

### Fuel & Expenses

Log fuel usage, add trip or vehicle expenses, and view total operational costs.

### Analytics

View operational metrics and charts, including fuel efficiency, utilization, operational cost, ROI, monthly revenue, and costliest vehicles.

### Settings & RBAC

Configure local prototype settings and view the role-based access matrix.

## Roles

The app includes these demo roles:

- Fleet Manager
- Dispatcher
- Safety Officer
- Financial Analyst

Role access is defined in:

```txt
client/src/lib/permissions.js
```

## Theme Support

TransitOps supports dark and light mode.

- Theme preference is saved in `localStorage`
- First visit defaults to the system color preference
- Theme state is provided by `ThemeProvider`
- Use `useTheme()` to read or toggle the current theme

Relevant files:

```txt
client/src/context/ThemeContext.jsx
client/src/context/useTheme.js
client/src/index.css
```

## Notes

- This is a hackathon prototype, not a production-hardened system.
- Supabase calls are made directly from the client.
- Some multi-step updates are intentionally implemented as sequential Supabase calls instead of database transactions.
- For production, add server-side validation, proper RLS policies, audit logs, and transactional workflows.

## Verification

The project has been checked with:

```bash
npm run lint
npm run build
```

On some Windows environments, the Vite/Tailwind build may need to run outside a restricted sandbox because Tailwind loads a native Windows binary.
