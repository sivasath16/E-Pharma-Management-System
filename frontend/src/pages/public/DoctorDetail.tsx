import { useQuery } from '@tanstack/react-query'
import { Badge, Button, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getDoctor, listAvailabilitySlots } from '../../api/doctors'
import { useAuth } from '../../auth/AuthContext'

export function DoctorDetail() {
  const { id } = useParams<{ id: string }>()
  const doctorId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const doctorQuery = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => getDoctor(doctorId),
    enabled: Number.isFinite(doctorId),
  })

  const slotsQuery = useQuery({
    queryKey: ['availability-slots', doctorId],
    queryFn: () => listAvailabilitySlots(doctorId, { available_only: true }),
    enabled: Number.isFinite(doctorId),
  })

  if (doctorQuery.isLoading) {
    return (
      <Container py="xl">
        <Loader />
      </Container>
    )
  }

  if (doctorQuery.isError || !doctorQuery.data) {
    return (
      <Container py="xl">
        <Text c="red">Doctor not found.</Text>
      </Container>
    )
  }

  const doctor = doctorQuery.data

  function handleBook() {
    if (!user) {
      navigate('/login', { state: { from: `/doctors/${doctorId}` } })
      return
    }
    // Booking flow itself is built in Frontend Phase 2 (Patient screens).
    navigate('/patient')
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{doctor.full_name ?? 'Unnamed Doctor'}</Title>
          {doctor.specialization && <Text c="dimmed">{doctor.specialization}</Text>}
          {doctor.qualification && <Text size="sm">{doctor.qualification}</Text>}
        </Stack>

        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={4}>Upcoming Availability</Title>
            {slotsQuery.isLoading && <Loader size="sm" />}
            {slotsQuery.data && slotsQuery.data.length === 0 && (
              <Text c="dimmed" size="sm">
                No upcoming availability right now.
              </Text>
            )}
            {slotsQuery.data?.map((slot) => (
              <Group key={slot.id} justify="space-between">
                <Text size="sm">
                  {dayjs(slot.start_time).format('MMM D, YYYY h:mm A')} –{' '}
                  {dayjs(slot.end_time).format('h:mm A')}
                </Text>
                <Badge color="green" variant="light">
                  Available
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>

        <Group>
          <Button onClick={handleBook}>Book Appointment</Button>
          <Button component={Link} to="/doctors" variant="subtle">
            Back to directory
          </Button>
        </Group>
      </Stack>
    </Container>
  )
}
