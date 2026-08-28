import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Radio,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getDoctor, listAvailabilitySlots } from '../../api/doctors'
import { createAppointment } from '../../api/appointments'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import type { AvailabilitySlot, ConsultationMode } from '../../api/types'

export function DoctorDetail() {
  const { id } = useParams<{ id: string }>()
  const doctorId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [bookingSlot, setBookingSlot] = useState<AvailabilitySlot | null>(null)
  const [consultationMode, setConsultationMode] = useState<ConsultationMode>('chat')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)

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

  function openBooking(slot: AvailabilitySlot) {
    if (!user) {
      navigate('/login', { state: { from: `/doctors/${doctorId}` } })
      return
    }
    setBookingSlot(slot)
    setConsultationMode('chat')
    setNotes('')
  }

  async function confirmBooking() {
    if (!bookingSlot) return
    setBooking(true)
    try {
      const appointment = await createAppointment({
        doctor_id: doctorId,
        slot_id: bookingSlot.id,
        consultation_mode: consultationMode,
        notes: notes || undefined,
      })
      notifications.show({ color: 'green', message: 'Appointment requested' })
      queryClient.invalidateQueries({ queryKey: ['availability-slots', doctorId] })
      setBookingSlot(null)
      navigate(`/patient/appointments/${appointment.id}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to book appointment'
      notifications.show({ color: 'red', title: 'Booking failed', message })
    } finally {
      setBooking(false)
    }
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
                {user?.role === 'patient' ? (
                  <Button size="xs" onClick={() => openBooking(slot)}>
                    Book
                  </Button>
                ) : (
                  <Badge color="green" variant="light">
                    Available
                  </Badge>
                )}
              </Group>
            ))}
          </Stack>
        </Card>

        <Group>
          {!user && (
            <Button onClick={() => navigate('/login', { state: { from: `/doctors/${doctorId}` } })}>
              Log in to Book
            </Button>
          )}
          <Button component={Link} to="/doctors" variant="subtle">
            Back to directory
          </Button>
        </Group>
      </Stack>

      <Modal opened={bookingSlot !== null} onClose={() => setBookingSlot(null)} title="Book Appointment">
        {bookingSlot && (
          <Stack>
            <Text size="sm">
              {dayjs(bookingSlot.start_time).format('MMM D, YYYY h:mm A')} –{' '}
              {dayjs(bookingSlot.end_time).format('h:mm A')}
            </Text>
            <Radio.Group
              label="Consultation mode"
              value={consultationMode}
              onChange={(value) => setConsultationMode(value as ConsultationMode)}
            >
              <Group mt="xs">
                <Radio value="chat" label="Chat" />
                <Radio value="video" label="Video" />
              </Group>
            </Radio.Group>
            <Textarea
              label="Notes (optional)"
              placeholder="Describe your reason for the visit..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />
            <Button onClick={confirmBooking} loading={booking}>
              Confirm Booking
            </Button>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
