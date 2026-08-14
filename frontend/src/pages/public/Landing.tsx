import { useState } from 'react'
import { Button, Card, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconSearch, IconStethoscope } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

export function Landing() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch() {
    navigate(query ? `/medicines?q=${encodeURIComponent(query)}` : '/medicines')
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>Welcome to E-Pharma</Title>
          <Text c="dimmed">
            Search medicines, order from a nearby pharmacy, or book a consultation with a doctor — all in one
            place.
          </Text>
        </Stack>

        <Group>
          <TextInput
            flex={1}
            placeholder="Search medicines..."
            leftSection={<IconSearch size={16} />}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>Search</Button>
        </Group>

        <Group grow>
          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconSearch size={28} />
              <Title order={3}>Order Medicine</Title>
              <Text size="sm" c="dimmed">
                Browse medicines across approved pharmacies and place an order for delivery or pickup.
              </Text>
              <Button variant="light" onClick={() => navigate('/medicines')}>
                Browse Medicines
              </Button>
            </Stack>
          </Card>

          <Card withBorder padding="lg">
            <Stack gap="xs">
              <IconStethoscope size={28} />
              <Title order={3}>Book Appointment</Title>
              <Text size="sm" c="dimmed">
                Find a doctor by specialty and book a chat or video consultation.
              </Text>
              <Button variant="light" onClick={() => navigate('/doctors')}>
                Find a Doctor
              </Button>
            </Stack>
          </Card>
        </Group>
      </Stack>
    </Container>
  )
}
