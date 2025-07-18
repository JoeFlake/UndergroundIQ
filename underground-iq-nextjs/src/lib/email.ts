import { createClient } from '@supabase/supabase-js';

// Types for email payload
export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  template?: 'welcome' | 'invitation' | 'newTicket';
  templateProps?: Record<string, any>;
  from?: string;
  replyTo?: string;
}

// Create Supabase client using Vite env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class EmailService {
  // Send a raw HTML email
  async sendEmail({ to, subject, html, from, replyTo }: EmailPayload) {
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, from, replyTo },
    });
    if (error) {
      throw new Error(error.message || 'Failed to send email');
    }
    return data;
  }

  // Send a template email
  async sendTemplateEmail({ to, subject, template, templateProps, from, replyTo }: EmailPayload) {
    if (!to || !subject || !template) {
      throw new Error('Missing required fields: to, subject, template');
    }
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, template, templateProps, from, replyTo },
    });
    if (error) {
      throw new Error(error.message || 'Failed to send template email');
    }
    return data;
  }
}

// Export a singleton instance
export const emailService = new EmailService(); 