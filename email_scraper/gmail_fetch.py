import os
import base64
import re
import json
import pickle
from datetime import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gmail API configuration
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
ORIGINAL_SENDER = 'noreply@bluestakes.org'  # Original sender to look for in forwarded emails

def parse_date(date_str: str) -> str:
    """Convert date string to ISO format"""
    try:
        # Parse date in format MM/DD/YY
        date_obj = datetime.strptime(date_str, "%m/%d/%y")
        return date_obj.strftime("%Y-%m-%d")  # Return as YYYY-MM-DD for Supabase date column
    except ValueError:
        return None

def parse_ticket_info(email_body: str) -> dict:
    """Parse ticket information from email body"""
    ticket_info = {}
    
    # Extract ticket number
    ticket_match = re.search(r'Ticket\s*:\s*([A-Z0-9-]+)', email_body)
    if ticket_match:
        ticket_info['ticket_number'] = ticket_match.group(1)
    
    # Extract dates
    legal_date_match = re.search(r'Legal date:\s*(\d{2}/\d{2}/\d{2})', email_body)
    if legal_date_match:
        ticket_info['legal_date'] = parse_date(legal_date_match.group(1))
    
    good_thru_match = re.search(r'Good Thru\s*:\s*(\d{2}/\d{2}/\d{2})', email_body)
    if good_thru_match:
        ticket_info['expiration_date'] = parse_date(good_thru_match.group(1))
    
    update_by_match = re.search(r'Update By\s*:\s*(\d{2}/\d{2}/\d{2})', email_body)
    if update_by_match:
        ticket_info['update_date'] = parse_date(update_by_match.group(1))
    
    # Extract location info for description
    location_patterns = {
        'State': r'State:\s*(\w+)',
        'County': r'Cnty:\s*(\w+)',
        'Place': r'Place:\s*(\w+)',
        'Street': r'Street\s*:\s*([^\n]+)',
        'Cross1': r'Cross 1\s*:\s*([^\n]+)',
        'Location': r'Location:\s*([^\n]+)',
    }
    
    location_parts = []
    for key, pattern in location_patterns.items():
        match = re.search(pattern, email_body)
        if match:
            value = match.group(1).strip()
            if value:
                location_parts.append(f"{value}")
    
    # Extract work type
    work_type_match = re.search(r'Work type:\s*([^\n]+)', email_body)
    if work_type_match:
        location_parts.append(f"Work: {work_type_match.group(1).strip()}")
    
    # Combine all parts into description
    ticket_info['description'] = ' - '.join(location_parts)
    
    # Extract map URL
    map_url_match = re.search(r'View ticket info at:\s*(https://[^\s]+)', email_body)
    if map_url_match:
        ticket_info['map_url'] = map_url_match.group(1).strip()
    
    # Store full email content
    ticket_info['full_ticket'] = email_body
    
    # Set default values
    ticket_info['active_status'] = True
    ticket_info['old_ticket_numbers'] = json.dumps([])  # Empty array for new tickets
    
    return ticket_info

def get_gmail_service():
    """Get or refresh Gmail API credentials."""
    creds = None
    if os.path.exists('token.pickle'):
        print("Found existing token.pickle file")
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        print("Credentials invalid or not found, refreshing...")
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('webapp.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
        print("New credentials saved to token.pickle")

    return build('gmail', 'v1', credentials=creds)

def get_email_body(part):
    """Recursively extract email body from parts."""
    # First check if this part has a body with data
    if 'body' in part and 'data' in part['body']:
        try:
            content = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
            # Check if this is the forwarded content
            if ORIGINAL_SENDER in content:
                # Extract just the ticket content
                ticket_content = content.split(ORIGINAL_SENDER)[-1].strip()
                return ticket_content
        except:
            pass

    # If this is a multipart message, check all parts
    if 'parts' in part:
        for subpart in part['parts']:
            # Skip attachments
            if subpart.get('filename'):
                continue
                
            # Check headers to identify the main content
            headers = subpart.get('headers', [])
            content_type = next((h['value'] for h in headers if h['name'].lower() == 'content-type'), '')
            
            # Skip image attachments
            if 'image' in content_type.lower():
                continue
                
            body = get_email_body(subpart)
            if body:
                return body

    return None

def extract_ticket_info(email_body):
    """Extract ticket information from email body."""
    print("\nExtracting ticket information from email...")
    
    # Extract ticket number
    ticket_match = re.search(r'Ticket\s*:\s*([A-Z0-9-]+)', email_body)
    ticket_number = ticket_match.group(1) if ticket_match else None
    print(f"Found ticket number: {ticket_number}")

    # Extract old ticket number if this is an update
    old_ticket_match = re.search(r'Old Ticket\s*:\s*([A-Z0-9-]+)', email_body)
    old_ticket_number = old_ticket_match.group(1) if old_ticket_match else None
    print(f"Found old ticket number: {old_ticket_number}")

    # Extract legal date
    legal_match = re.search(r'Legal date:\s*(\d{2}/\d{2}/\d{2})', email_body)
    legal_date = parse_date(legal_match.group(1)) if legal_match else None
    print(f"Found legal date: {legal_date}")

    # Extract expiration date
    expiration_match = re.search(r'Good Thru\s*:\s*(\d{2}/\d{2}/\d{2})', email_body)
    expiration_date = parse_date(expiration_match.group(1)) if expiration_match else None
    print(f"Found expiration date: {expiration_date}")

    # Extract update date
    update_match = re.search(r'Update By\s*:\s*(\d{2}/\d{2}/\d{2})', email_body)
    update_date = parse_date(update_match.group(1)) if update_match else None
    print(f"Found update date: {update_date}")

    # Extract location info for description
    location_patterns = {
        'State': r'State:\s*(\w+)',
        'County': r'Cnty:\s*(\w+)',
        'Place': r'Place:\s*(\w+)',
        'Street': r'Street\s*:\s*([^\n]+)',
        'Cross1': r'Cross 1\s*:\s*([^\n]+)',
        'Location': r'Location:\s*([^\n]+)',
    }
    
    location_parts = []
    for key, pattern in location_patterns.items():
        match = re.search(pattern, email_body)
        if match:
            value = match.group(1).strip()
            if value:
                location_parts.append(f"{value}")
    
    # Extract work type
    work_type_match = re.search(r'Work type:\s*([^\n]+)', email_body)
    if work_type_match:
        location_parts.append(f"Work: {work_type_match.group(1).strip()}")
    
    # Combine all parts into description
    description = ' - '.join(location_parts)
    print(f"Found description: {description}")

    # Extract map URL
    map_match = re.search(r'View ticket info at:\s*(https://[^\s]+)', email_body)
    map_url = map_match.group(1).strip() if map_match else None
    print(f"Found map URL: {map_url}")

    # Create ticket info matching exact database schema
    ticket_info = {
        'project_id': 1,  # Default project ID - this should match an existing project
        'ticket_number': ticket_number,
        'old_ticket_numbers': json.dumps([]),  # Will be updated if this is an update
        'expiration_date': expiration_date,
        'update_date': update_date,
        'legal_date': legal_date,
        'description': description,
        'map_url': map_url,
        'full_ticket': email_body,
        'active_status': True,
        'is_update': bool(old_ticket_number),
        'old_ticket_number': old_ticket_number
    }

    return ticket_info

def process_emails():
    """Fetch and process emails from Blue Stakes."""
    print("Starting email processing...")
    service = get_gmail_service()
    
    # Search for all forwarded emails containing Blue Stakes content
    # We'll search for emails containing the original sender's address
    query = f'in:inbox {ORIGINAL_SENDER}'
    print(f"Searching for emails with query: {query}")
    
    try:
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])
        print(f"Found {len(messages) if messages else 0} potential Blue Stakes emails")

        if not messages:
            print("No messages found.")
            return

        for message in messages:
            print(f"\nProcessing message ID: {message['id']}")
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            
            # Get email headers
            headers = msg['payload'].get('headers', [])
            from_header = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown Sender')
            print(f"Email from: {from_header}")
            
            # Get email body
            if 'payload' in msg:
                print(f"Processing email payload")
                print(f"Payload mimeType: {msg['payload'].get('mimeType')}")
                
                # Get email body
                email_body = get_email_body(msg['payload'])
                
                if email_body:
                    print("Successfully decoded email body")
                    print(f"Email body preview: {email_body[:200]}...")  # Show first 200 chars
                    
                    # Check if this is a forwarded email from Blue Stakes
                    if ORIGINAL_SENDER in email_body:
                        print(f"Found forwarded email from {ORIGINAL_SENDER}")
                        
                        # Extract ticket information
                        ticket_info = extract_ticket_info(email_body)
                        
                        # Only proceed if we found a ticket number
                        if ticket_info['ticket_number']:
                            if ticket_info.get('is_update') and ticket_info.get('old_ticket_number'):
                                # This is an update to an existing ticket
                                print(f"Processing update for ticket {ticket_info['old_ticket_number']} -> {ticket_info['ticket_number']}")
                                
                                # Get the existing ticket
                                existing = supabase.table('tickets').select('*').eq('ticket_number', ticket_info['old_ticket_number']).execute()
                                
                                if existing.data:
                                    old_ticket = existing.data[0]
                                    
                                    try:
                                        # Load existing old_ticket_numbers object
                                        old_numbers = json.loads(old_ticket['old_ticket_numbers'])
                                        if not isinstance(old_numbers, dict):
                                            old_numbers = {}
                                    except (json.JSONDecodeError, TypeError):
                                        # If there's any issue with the existing JSON, start fresh
                                        old_numbers = {}
                                    
                                    # Add the current ticket info to history
                                    old_numbers[old_ticket['ticket_number']] = {
                                        "legal_date": old_ticket['legal_date'].strftime("%m/%d/%Y") if old_ticket['legal_date'] else "",
                                        "update_date": old_ticket['update_date'].strftime("%m/%d/%Y") if old_ticket['update_date'] else "",
                                        "expiration_date": old_ticket['expiration_date'].strftime("%m/%d/%Y") if old_ticket['expiration_date'] else ""
                                    }
                                    
                                    # Update the existing ticket with new information
                                    update_data = {
                                        'ticket_number': ticket_info['ticket_number'],
                                        'old_ticket_numbers': json.dumps(old_numbers),
                                        'legal_date': ticket_info['legal_date'],
                                        'expiration_date': ticket_info['expiration_date'],
                                        'update_date': ticket_info['update_date'],
                                        'description': ticket_info['description'],
                                        'map_url': ticket_info['map_url'],
                                        'full_ticket': ticket_info['full_ticket']
                                    }
                                    
                                    result = supabase.table('tickets').update(update_data).eq('ticket_number', ticket_info['old_ticket_number']).execute()
                                    print(f"Updated ticket {ticket_info['old_ticket_number']} to {ticket_info['ticket_number']}")
                                    print(f"Added {old_ticket['ticket_number']} to old_ticket_numbers")
                                else:
                                    print(f"Could not find original ticket {ticket_info['old_ticket_number']}")
                            else:
                                # This is a new ticket
                                existing = supabase.table('tickets').select('*').eq('ticket_number', ticket_info['ticket_number']).execute()
                                
                                if not existing.data:
                                    # Remove temporary fields used for processing
                                    if 'is_update' in ticket_info:
                                        del ticket_info['is_update']
                                    if 'old_ticket_number' in ticket_info:
                                        del ticket_info['old_ticket_number']
                                    
                                    # Initialize empty object for old_ticket_numbers
                                    ticket_info['old_ticket_numbers'] = json.dumps({})
                                        
                                    print(f"Inserting new ticket {ticket_info['ticket_number']} into database")
                                    result = supabase.table('tickets').insert(ticket_info).execute()
                                    print(f"Successfully inserted ticket {ticket_info['ticket_number']}")
                                else:
                                    print(f"Ticket {ticket_info['ticket_number']} already exists in database")
                        else:
                            print("No ticket number found in email, skipping...")
                    else:
                        print(f"Email is not from {ORIGINAL_SENDER}, skipping...")
                else:
                    print("Could not extract email body")
                    print("Payload structure:", json.dumps(msg['payload'], indent=2))
            else:
                print("No payload found in message")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == '__main__':
    process_emails()
