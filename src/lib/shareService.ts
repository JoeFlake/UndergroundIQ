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
  },

  printTicketCard(ticketNumber: string) {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      // Generate the ticket card HTML
      const ticketCardHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket ${ticketNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
            .ticket-card {
              border: 2px solid #333;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
            }
            .ticket-header {
              text-align: center;
              border-bottom: 1px solid #ccc;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .ticket-number {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            .ticket-info {
              margin-bottom: 15px;
            }
            .ticket-info label {
              font-weight: bold;
              display: inline-block;
              width: 120px;
            }
            .print-button {
              display: none;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-number">Ticket #${ticketNumber}</div>
              <div>BlueStakes Ticket Information</div>
            </div>
            <div class="ticket-info">
              <label>Ticket Number:</label>
              <span>${ticketNumber}</span>
            </div>
            <div class="ticket-info">
              <label>Generated:</label>
              <span>${new Date().toLocaleString()}</span>
            </div>
            <div class="ticket-info">
              <label>Status:</label>
              <span>Active</span>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
              This ticket information was generated from UndergroundIQ
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(ticketCardHtml);
      printWindow.document.close();
    } catch (error) {
      console.error('Failed to print ticket card:', error);
      throw new Error('Failed to generate ticket card for printing');
    }
  }
}; 