import { Button, Card, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconBottle, IconCalendarEvent, IconFileText, IconReceipt, IconShoppingCart, IconUser } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

export function PatientHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Patient Dashboard</Title>
          <Text c="dimmed">Signed in as {user?.email}.</Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconBottle size={24} />
              <Text fw={600}>Medicines</Text>
              <Text size="sm" c="dimmed">
                Search and add medicines to your cart.
              </Text>
              <Button component={Link} to="/medicines" variant="light" size="xs">
                Browse Medicines
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconShoppingCart size={24} />
              <Text fw={600}>Cart & Orders</Text>
              <Text size="sm" c="dimmed">
                Checkout your cart, pay, and track order status.
              </Text>
              <Group gap="xs">
                <Button component={Link} to="/patient/cart" variant="light" size="xs">
                  Cart
                </Button>
                <Button component={Link} to="/patient/orders" variant="light" size="xs">
                  Order History
                </Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconFileText size={24} />
              <Text fw={600}>Prescriptions</Text>
              <Text size="sm" c="dimmed">
                Upload and view your prescriptions.
              </Text>
              <Button component={Link} to="/patient/prescriptions" variant="light" size="xs">
                My Prescriptions
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconReceipt size={24} />
              <Text fw={600}>Notifications</Text>
              <Text size="sm" c="dimmed">
                Booking, payment, and order status updates.
              </Text>
              <Button component={Link} to="/notifications" variant="light" size="xs">
                View Notifications
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconCalendarEvent size={24} />
              <Text fw={600}>Appointments</Text>
              <Text size="sm" c="dimmed">
                Book a doctor from the directory, track and join consultations.
              </Text>
              <Group gap="xs">
                <Button component={Link} to="/doctors" variant="light" size="xs">
                  Find a Doctor
                </Button>
                <Button component={Link} to="/patient/appointments" variant="light" size="xs">
                  My Appointments
                </Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconUser size={24} />
              <Text fw={600}>Profile</Text>
              <Text size="sm" c="dimmed">
                Update your health info and address.
              </Text>
              <Button component={Link} to="/patient/profile" variant="light" size="xs">
                Edit Profile
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
