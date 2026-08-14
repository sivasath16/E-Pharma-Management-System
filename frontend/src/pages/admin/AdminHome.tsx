import { Container, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../../auth/AuthContext'

export function AdminHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={2}>Admin Dashboard</Title>
        <Text>Signed in as {user?.email}.</Text>
        <Text c="dimmed" size="sm">
          User management, monitoring, and reports land here in Frontend Phase 5.
        </Text>
      </Stack>
    </Container>
  )
}
