import {
    Button,
    Html,
    Tailwind,
    Text,
    Container,
    Section,
    Head,
  } from '@react-email/components';
  
  interface NewTicketEmailProps {
    ticketId: string;
    ticketProject: string;
    ticketDescription: string;
    ticketCategory: string;
    ticketLink: string;
    createdAt: string; // ISO date string
  }
  
  export default function NewTicket({
    ticketId,
    ticketProject,
    ticketDescription,
    ticketLink,
    createdAt,
  }: NewTicketEmailProps) {
    const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short'
    });

    return (
      <Html>
        <Head />
        <Tailwind>
          <Container className="mx-auto py-16 px-4 max-w-2xl">
            <Section className="mt-8">
              <Text className="text-2xl font-light tracking-tight text-black mb-8">
                New Ticket Created for {ticketProject || 'Default Project'}
              </Text>
              <div className="border border-black/10 rounded-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-black/5">
                      <th className="px-6 py-4 text-left text-xs font-medium text-black/60 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-black/60 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-black/60 uppercase tracking-wider">Legal Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-6 py-4 text-sm text-black/80 border-t border-black/10">{ticketProject || 'Unknown Project'}</td>
                      <td className="px-6 py-4 text-sm text-black/80 border-t border-black/10">{ticketId || 'A01011165'}</td>
                      <td className="px-6 py-4 text-sm text-black/80 border-t border-black/10">{formattedDate || 'Unknown Date'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
  
            <Section className="mt-12 bg-black/5 p-8 rounded-sm">
              <Text className="text-lg font-light text-black/90">
                {ticketDescription}
              </Text>
            </Section>
  
            <Section className="mt-12 text-center">
              <Button
                className="bg-black text-white rounded-sm px-8 py-4 font-light tracking-wide hover:bg-black/90 transition-colors"
                href={ticketLink}
              >
                View Ticket Details
              </Button>
            </Section>
  
            <Section className="mt-12 bg-black/5 p-8 rounded-sm">
              <Text className="text-lg font-light text-black/90 mb-6">
                Next Steps
              </Text>
              <ul className="space-y-3 text-black/80">
                <li className="flex items-start">
                  <span className="mr-2 text-black/60">•</span>
                  <span>Review the ticket details</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-black/60">•</span>
                  <span>Verify that the ticket area matches the proposed dig area</span>
                </li>
              </ul>
            </Section>
  
            <Section className="mt-12 border-t border-black/10 pt-8">
              <Text className="text-sm text-black/60">
                You're receiving this email because you're involved with this ticket. To update your notification preferences, visit your account settings.
              </Text>
            </Section>
  
            <Section className="mt-8 text-center">
              <Text className="text-xs text-black/40">
                UndergroundIQ • PO Box 12345 • Spanish Fork, UT 84660
              </Text>
            </Section>
          </Container>
        </Tailwind>
      </Html>
    );
  }
  