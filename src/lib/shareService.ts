interface CopyTicketLinkOptions {
  includeProjectContext?: boolean;
  expiresIn?: number;
}

export const shareService = {
  async copyTicketLink(ticketNumber: string, options: CopyTicketLinkOptions = {}) {
    try {
      // Generate a shareable link for the ticket
      const baseUrl = window.location.origin;
      const ticketUrl = `${baseUrl}/tickets/${ticketNumber}`;
      
      // Add project context if requested
      const url = options.includeProjectContext 
        ? `${ticketUrl}?project=${encodeURIComponent(window.location.search.replace('?', ''))}`
        : ticketUrl;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      
      return url;
    } catch (error) {
      console.error('Failed to copy ticket link:', error);
      throw new Error('Failed to copy ticket link to clipboard');
    }
  }
}; 