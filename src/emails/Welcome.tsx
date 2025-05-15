import {
  Button,
  Html,
  Tailwind,
  Text,
  Container,
  Section,
  Link,
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
        <Container className="mx-auto py-20 px-4">
          <Section className="mt-8">
            <Text className="text-3xl font-bold text-gray-800">
              Welcome to UndergroundIQ! 👋
            </Text>
            <Text className="text-lg text-gray-600 mt-4">
              Hi {username},
            </Text>
            <Text className="text-gray-600 mt-4">
              We're excited to have you join our community of knowledge seekers. Your journey to mastering underground infrastructure starts here.
            </Text>
          </Section>

          <Section className="mt-8">
            <Text className="text-gray-600">
              Here's what you can do next:
            </Text>
            <ul className="list-disc pl-6 mt-4 text-gray-600">
              <li>Complete your profile</li>
              <li>Browse our learning resources</li>
              <li>Connect with other professionals</li>
              <li>Start your first course</li>
            </ul>
          </Section>

          <Section className="mt-8">
            <Button
              className="bg-blue-600 rounded-md text-white px-6 py-3 font-medium"
              href={loginLink}
            >
              Get Started
            </Button>
          </Section>

          <Section className="mt-8 border-t border-gray-200 pt-8">
            <Text className="text-sm text-gray-500">
              If you have any questions, just reply to this email - we're always happy to help.
            </Text>
          </Section>

          <Section className="mt-8 text-center">
            <Text className="text-xs text-gray-400">
              UndergroundIQ Inc. • 123 Infrastructure Ave • Your City, ST 12345
            </Text>
            <Text className="text-xs text-gray-400 mt-2">
              <Link href="#" className="text-blue-600 underline">Unsubscribe</Link> • 
              <Link href="#" className="text-blue-600 underline ml-2">Privacy Policy</Link>
            </Text>
          </Section>
        </Container>
      </Tailwind>
    </Html>
  );
}
