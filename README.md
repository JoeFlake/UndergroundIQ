# UndergroundIQ

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
git clone https://github.com/tmanatkin/UndergroundIQ.git
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

The application will be available at `http://localhost:8080`.

## Project Structure

```
src/
├── assets/          # Static assets (images, logos, etc.)
├── components/      # Reusable UI components
├── contexts/        # React context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and configurations
├── pages/          # Page components
└── types/          # TypeScript type definitions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Acknowledgments

This project was developed with assistance from Lovable, ChatGPT, and Cursor.
