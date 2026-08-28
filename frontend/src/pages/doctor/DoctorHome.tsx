import { Button, Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconCalendarEvent, IconClock, IconUser } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function DoctorHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Doctor Dashboard</Title>
          <Text c="dimmed">Signed in as {user?.email}.</Text>
          {!user?.is_approved && (
            <Text c="orange" size="sm">
              Your account is pending Admin approval.
            </Text>
          )}
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconClock size={24} />
              <Text fw={600}>Availability</Text>
              <Text size="sm" c="dimmed">
                Add or remove bookable time slots.
              </Text>
              <Button component={Link} to="/doctor/availability" variant="light" size="xs">
                Manage Availability
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconCalendarEvent size={24} />
              <Text fw={600}>Appointments</Text>
              <Text size="sm" c="dimmed">
                Confirm/reject requests, consult, and issue prescriptions.
              </Text>
              <Button component={Link} to="/doctor/appointments" variant="light" size="xs">
                View Appointments
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconUser size={24} />
              <Text fw={600}>Profile</Text>
              <Text size="sm" c="dimmed">
                Update your qualification and specialization.
              </Text>
              <Button component={Link} to="/doctor/profile" variant="light" size="xs">
                Edit Profile
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
