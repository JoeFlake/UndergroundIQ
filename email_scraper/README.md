# Email Ticket Scraper

This script automatically fetches forwarded Blue Stakes emails from Gmail and stores the ticket information in your Supabase database.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up environment variables:
   Create a `.env` file in the same directory with:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
```

3. Set up Google OAuth 2.0:

- Go to Google Cloud Console
- Create OAuth 2.0 credentials
- Download the client configuration file and save it as `webapp.json` in this directory

4. Create the database table:

- Copy the contents of `migrations/create_tickets_table.sql`
- Run it in your Supabase SQL editor

## Usage

Run the script:

```bash
python gmail_fetch.py
```

The script will:

1. Authenticate with Gmail (first time will open browser for OAuth)
2. Search for forwarded Blue Stakes emails
3. Parse ticket information
4. Store new tickets in your Supabase database

## Features

- Automatically extracts ticket information:
  - Ticket number
  - Legal date
  - Good through date
  - Update by date
  - Location details
  - Work type
  - Map URL
  - Member responses
- Checks for duplicate tickets
- Stores data in structured format
- Secure authentication with Gmail and Supabase

## Error Handling

- The script will skip emails that don't match the expected format
- Duplicate tickets are detected and skipped
- All errors are logged with descriptive messages

## Database Schema

The tickets table includes:

- `id`: Primary key
- `ticket_number`: Unique ticket identifier
- `legal_date`: When the ticket becomes legal
- `good_thru_date`: Ticket expiration date
- `update_by_date`: Last date for updates
- `location`: JSON object with location details
- `work_type`: Type of work to be performed
- `map_url`: URL to the ticket map
- `member_responses`: JSON array of member responses
- `created_at`: Timestamp of database entry
- `status`: Current ticket status
- `project_id`: Foreign key to projects table
