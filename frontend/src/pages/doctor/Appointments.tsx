import { useQuery } from '@tanstack/react-query'
import { Badge, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { listDoctorAppointments } from '../../api/appointments'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  confirmed: 'blue',
  rejected: 'red',
  cancelled: 'red',
  completed: 'green',
}

export function DoctorAppointments() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['appointments', 'doctor', 'me'],
    queryFn: listDoctorAppointments,
  })

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Appointments</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load appointments.</Text>}
        {data && data.length === 0 && <Text c="dimmed">No appointments yet.</Text>}

        {data?.map((appointment) => (
          <Card
            key={appointment.id}
            component={Link}
            to={`/doctor/appointments/${appointment.id}`}
            withBorder
            padding="md"
          >
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={600}>Appointment #{appointment.id}</Text>
                <Text size="sm" c="dimmed">
                  {dayjs(appointment.start_time).format('MMM D, YYYY h:mm A')} · {appointment.consultation_mode}
                </Text>
              </Stack>
              <Badge color={STATUS_COLOR[appointment.status] ?? 'gray'}>{appointment.status}</Badge>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
