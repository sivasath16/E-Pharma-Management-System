import { Container, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../../auth/AuthContext'

export function DoctorHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={2}>Doctor Dashboard</Title>
        <Text>Signed in as {user?.email}.</Text>
        {!user?.is_approved && (
          <Text c="orange" size="sm">
            Your account is pending Admin approval.
          </Text>
        )}
        <Text c="dimmed" size="sm">
          Availability management and appointment handling land here in Frontend Phase 3.
        </Text>
      </Stack>
    </Container>
  )
}
