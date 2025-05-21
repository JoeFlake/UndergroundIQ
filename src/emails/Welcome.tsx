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

interface WelcomeEmailProps {
  username?: string;
  loginLink?: string;
}

export default function Welcome({ 
  username = 'there',
  loginLink = 'https://underground-iq.com/login'
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Container className="mx-auto py-8 px-4 max-w-2xl bg-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
          {/* Logo Section */}
          <Section className="text-center mb-4">
            <Img
              src="https://raw.githubusercontent.com/JoeFlake/UndergroundIQ/main/src/assets/images/Logo-Icon.PNG"
              width="48"
              alt="UndergroundIQ Logo"
              className="mx-auto"
            />
          </Section>

          <Section className="mt-4">
            <Text className="text-2xl font-black tracking-tight text-gray-900 mb-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Welcome to UndergroundIQ
            </Text>
            <Text className="text-lg text-gray-700 mb-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Hi {username},
            </Text>
            <Text className="text-gray-700 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Welcome to UndergroundIQ — the smarter way to manage your Bluestakes tickets. Whether you're in the field or in the office, we're here to help you stay on top of every dig ticket with simple tools, automated alerts, and real-time project insights.
            </Text>
          </Section>

          <Section className="mt-12 bg-gray-50 p-8 rounded-lg">
            <Text className="text-lg font-medium text-gray-900 mb-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Here's what you can expect:
            </Text>
            <ul className="space-y-4 text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              <li className="flex items-start">
                <span className="mr-3 text-gray-500">•</span>
                <span className="leading-relaxed">Effortless ticket tracking across all your projects</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-500">•</span>
                <span className="leading-relaxed">Automated email alerts to keep your team in sync</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-gray-500">•</span>
                <span className="leading-relaxed">Interactive maps for fast, accurate location data</span>
              </li>
            </ul>
          </Section>

          <Section className="mt-12">
            <Text className="text-gray-700 leading-relaxed mb-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Your safety and efficiency are our top priorities — and we're here to help you reduce risk, avoid costly delays, and streamline communication from day one.
            </Text>
            <Text className="text-lg font-medium text-gray-900 mb-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Get started in 3 easy steps:
            </Text>
            <ol className="space-y-3 text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              <li className="flex items-start">
                <span className="mr-2 text-gray-500">1.</span>
                <span>Log in and create your first project</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-500">2.</span>
                <span>Add team members and assign roles</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-gray-500">3.</span>
                <span>Start adding your Bluestakes ticket numbers</span>
              </li>
            </ol>
          </Section>

          <Section className="mt-12 text-center">
            <Button
              className="bg-orange-500 text-white rounded-lg px-8 py-4 font-medium tracking-wide hover:bg-orange-600 transition-colors shadow-sm"
              href={loginLink}
              style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
            >
              Get Started
            </Button>
          </Section>

          <Section className="mt-12 border-t border-gray-200 pt-8">
            <Text className="text-gray-700" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              Thanks for choosing UndergroundIQ — we're glad to have you on board.
            </Text>
            <Text className="text-gray-700 mt-2" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              — The UndergroundIQ Team
            </Text>
          </Section>

          <Section className="mt-8 text-center">
            <Text className="text-xs text-gray-400" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              UndergroundIQ • PO Box 12345 • Spanish Fork, UT 84660
            </Text>
          </Section>
        </Container>
      </Tailwind>
    </Html>
  );
}
