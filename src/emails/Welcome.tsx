import {
  Button,
  Html,
  Tailwind,
  Text,
  Container,
  Section,
  Head,
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
        <Container className="mx-auto py-16 px-4 max-w-2xl">
          <Section className="mt-8">
            <Text className="text-2xl font-light tracking-tight text-black mb-8">
              Easy Ticket Tracking That Protects Your People — and Your Bottom Line
            </Text>
            <Text className="text-lg font-light text-black/90 mb-6">
              Hi {username},
            </Text>
            <Text className="text-black/80 leading-relaxed">
              Welcome to UndergroundIQ — the smarter way to manage your Bluestakes tickets. Whether you're in the field or in the office, we're here to help you stay on top of every dig ticket with simple tools, automated alerts, and real-time project insights.
            </Text>
          </Section>

          <Section className="mt-12 bg-black/5 p-8 rounded-sm">
            <Text className="text-lg font-light text-black/90 mb-6">
              Here's what you can expect:
            </Text>
            <ul className="space-y-8 text-black/80">
              <li className="flex items-start">
                <span className="mr-3 text-black/60">•</span>
                <span className="leading-relaxed">Effortless ticket tracking across all your projects</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-black/60">•</span>
                <span className="leading-relaxed">Automated email alerts to keep your team in sync</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-black/60">•</span>
                <span className="leading-relaxed">Interactive maps for fast, accurate location data</span>
              </li>
            </ul>
          </Section>

          <Section className="mt-12">
            <Text className="text-black/80 leading-relaxed mb-6">
              Your safety and efficiency are our top priorities — and we're here to help you reduce risk, avoid costly delays, and streamline communication from day one.
            </Text>
            <Text className="text-lg font-light text-black/90 mb-6">Get started in 3 easy steps:</Text>
            <ol className="space-y-3 text-black/80">
              <li className="flex items-start">
                <span className="mr-2 text-black/60">1.</span>
                <span>Log in and create your first project</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-black/60">2.</span>
                <span>Add team members and assign roles</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-black/60">3.</span>
                <span>Start adding your Bluestakes ticket numbers</span>
              </li>
            </ol>
          </Section>

          <Section className="mt-12 text-center">
            <Button
              className="bg-black text-white rounded-sm px-8 py-4 font-light tracking-wide hover:bg-black/90 transition-colors"
              href={loginLink}
            >
              Get Started
            </Button>
          </Section>

          <Section className="mt-12 border-t border-black/10 pt-8">
            <Text className="text-black/80">
              Thanks for choosing UndergroundIQ — we're glad to have you on board.
            </Text>
            <Text className="text-black/80">
            — The UndergroundIQ Team
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
