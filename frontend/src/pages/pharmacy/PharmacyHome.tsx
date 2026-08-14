import { Container, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../../auth/AuthContext'

export function PharmacyHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={2}>Pharmacy Dashboard</Title>
        <Text>Signed in as {user?.email}.</Text>
        {!user?.is_approved && (
          <Text c="orange" size="sm">
            Your account is pending Admin approval.
          </Text>
        )}
        <Text c="dimmed" size="sm">
          Inventory management and order fulfillment land here in Frontend Phase 4.
        </Text>
      </Stack>
    </Container>
  )
}
