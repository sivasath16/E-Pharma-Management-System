import { Container, Stack, Text, Title } from '@mantine/core'
import { useAuth } from '../../auth/AuthContext'

export function PatientHome() {
  const { user } = useAuth()

  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={2}>Patient Dashboard</Title>
        <Text>Signed in as {user?.email}.</Text>
        <Text c="dimmed" size="sm">
          Prescriptions, medicine ordering, and appointment booking land here in Frontend Phase 2.
        </Text>
      </Stack>
    </Container>
  )
}
