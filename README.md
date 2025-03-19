# UndergroundIQ

Insert description here

## Features

- 🔐 Secure authentication with Supabase
- 🎨 Modern, responsive UI with Tailwind CSS
- 📱 Mobile-friendly design
- 🔄 Automatic session persistence
- 🛡️ Protected routes
- 🎯 Project and ticket management system

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Router
- Shadcn UI Components
- Lucide Icons

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd UndergroundIQ
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

## Database Schema

The application uses the following Supabase tables:

### Projects

- `id` (bigint, primary key)
- `name` (text)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### Tickets

- `id` (bigint, primary key)
- `project_id` (bigint, foreign key)
- `description` (text)
- `expiration_date` (date)
- `map_url` (text)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### Users-Projects (Junction Table)

- `user_id` (uuid, references auth.users)
- `project_id` (bigint, references projects)

## Features in Detail

### Authentication

- Email/password sign-up and sign-in
- Automatic session persistence
- Protected routes
- Automatic redirection based on auth state

### Project Management

- View all projects associated with the user
- Create and manage tickets within projects
- Interactive map integration for ticket locations
- Real-time updates using Supabase

### Security

- Row Level Security (RLS) policies implemented
- Secure session management
- Protected API endpoints
- Environment variable protection

## Development

### Project Structure

```
UndergroundIQ/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and services
│   ├── pages/         # Page components
│   ├── types/         # TypeScript type definitions
│   └── App.tsx        # Main application component
├── public/            # Static assets
└── index.html         # Entry HTML file
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
