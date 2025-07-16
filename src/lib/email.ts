'use server';

import { Resend } from 'resend';
import Welcome from '@/emails/Welcome';
import NewTicket from '@/emails/NewTicket';
import { ReactElement } from 'react';
import { renderAsync } from '@react-email/render';

// Export the prop types
export type WelcomeEmailProps = React.ComponentProps<typeof Welcome>;
export type NewTicketEmailProps = React.ComponentProps<typeof NewTicket>;

// This module is server-side only and should never be imported in client components
if (typeof window !== 'undefined') {
  throw new Error('Email module cannot be used in client components');
}

// Initialize Resend with API key
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

// Define the base email configuration
interface BaseEmailConfig {
  to: string | string[];
  from?: string;
  subject: string;
  replyTo?: string;
}

// Define available templates and their props
interface EmailTemplates {
  welcome: {
    template: typeof Welcome;
    props: React.ComponentProps<typeof Welcome>;
  };
  newTicket: {
    template: typeof NewTicket;
    props: React.ComponentProps<typeof NewTicket>;
  };
}

// Type for template names
type TemplateName = keyof EmailTemplates;

// Type for the send function parameters
interface SendEmailParams<T extends TemplateName> extends BaseEmailConfig {
  template: T;
  props: EmailTemplates[T]['props'];
}

// Default from address
const DEFAULT_FROM = 'UndergroundIQ <notifications@underground-iq.com>';

// Template mapping
const templates: EmailTemplates = {
  welcome: {
    template: Welcome,
    props: {} as React.ComponentProps<typeof Welcome>,
  },
  newTicket: {
    template: NewTicket,
    props: {} as React.ComponentProps<typeof NewTicket>,
  },
};

/**
 * Sends an email using the specified template
 * This function can only be called from server components or server actions
 * @param params Email parameters including template name and props
 * @returns Promise with the send result
 */
export async function sendEmail<T extends TemplateName>({
  template,
  props,
  to,
  from = DEFAULT_FROM,
  subject,
  replyTo,
}: SendEmailParams<T>) {
  // Additional server-side check
  if (typeof window !== 'undefined') {
    throw new Error('sendEmail can only be called from server components or server actions');
  }

  try {
    // Get the template component
    const TemplateComponent = templates[template].template;

    // Render the email component to HTML
    const html = await renderAsync(TemplateComponent(props as any));

    // Send the email
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo,
    });

    if (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Example usage:
/*
// Send welcome email
await sendEmail({
  template: 'welcome',
  props: {
    username: 'John',
    loginLink: 'https://underground-iq.com/login',
  },
  to: 'user@example.com',
  subject: 'Welcome to UndergroundIQ',
});

// Send new ticket notification
await sendEmail({
  template: 'newTicket',
  props: {
    ticketId: 'TICKET-123',
    ticketProject: 'Downtown Project',
    ticketDescription: 'New ticket created for review',
    ticketLink: 'https://underground-iq.com/tickets/123',
    createdAt: new Date().toISOString(),
  },
  to: 'team@example.com',
  subject: 'New Ticket Created - TICKET-123',
});
*/ 