import {
    Button,
    Html,
    Tailwind,
    Text,
    Container,
    Section,
    Head,
    Img,
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
          <Container className="mx-auto py-12 px-4 max-w-2xl bg-white">
            {/* Logo Section */}
            <Section className="text-center mb-12">
              <Img
                src="/src/assets/images/Logo-Icon.PNG"
                width="64"
                height="64"
                alt="UndergroundIQ Logo"
                className="mx-auto"
              />
            </Section>

            <Section className="mt-8">
              <Text className="text-2xl font-light tracking-tight text-gray-900 mb-8">
                New Ticket Created for {ticketProject || 'Default Project'}
              </Text>
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Legal Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-700 border-t border-gray-100">{ticketProject || 'Unknown Project'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 border-t border-gray-100">{ticketId || 'A01011165'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 border-t border-gray-100">{formattedDate || 'Unknown Date'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
  
            <Section className="mt-12 bg-gray-50 p-8 rounded-lg">
              <Text className="text-lg font-light text-gray-800 leading-relaxed">
                {ticketDescription}
              </Text>
            </Section>
  
            <Section className="mt-12 text-center">
              <Button
                className="bg-orange-500 text-white rounded-lg px-8 py-4 font-medium tracking-wide hover:bg-orange-600 transition-colors shadow-sm"
                href={ticketLink}
              >
                View Ticket Details
              </Button>
            </Section>
  
            <Section className="mt-12 bg-gray-50 p-8 rounded-lg">
              <Text className="text-lg font-medium text-gray-900 mb-6">
                Next Steps
              </Text>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="mr-3 text-gray-500">•</span>
                  <span className="leading-relaxed">Review the ticket details</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-gray-500">•</span>
                  <span className="leading-relaxed">Verify that the ticket area matches the proposed dig area</span>
                </li>
              </ul>
            </Section>
  
            <Section className="mt-12 border-t border-gray-200 pt-8">
              <Text className="text-sm text-gray-500 leading-relaxed">
                You're receiving this email because you're involved with this ticket. To update your notification preferences, visit your account settings.
              </Text>
            </Section>
  
            <Section className="mt-8 text-center">
              <Text className="text-xs text-gray-400">
                UndergroundIQ • PO Box 12345 • Spanish Fork, UT 84660
              </Text>
            </Section>
          </Container>
        </Tailwind>
      </Html>
    );
  }
  