import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getAppointment, updateAppointmentStatus } from '../../api/appointments'
import { listMyPrescriptions } from '../../api/prescriptions'
import { ChatThread } from '../../components/ChatThread'
import { ApiError } from '../../api/client'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  confirmed: 'blue',
  rejected: 'red',
  cancelled: 'red',
  completed: 'green',
}

export function PatientAppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const appointmentId = Number(id)
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)

  const appointmentQuery = useQuery({
    queryKey: ['appointments', appointmentId],
    queryFn: () => getAppointment(appointmentId),
    enabled: Number.isFinite(appointmentId),
  })

  const prescriptionsQuery = useQuery({
    queryKey: ['prescriptions', 'me'],
    queryFn: listMyPrescriptions,
  })

  async function handleCancel() {
    setCancelling(true)
    try {
      await updateAppointmentStatus(appointmentId, { status: 'cancelled' })
      notifications.show({ color: 'green', message: 'Appointment cancelled' })
      queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to cancel'
      notifications.show({ color: 'red', title: 'Cancel failed', message })
    } finally {
      setCancelling(false)
    }
  }

  if (appointmentQuery.isLoading) {
    return (
      <Container py="xl">
        <Loader />
      </Container>
    )
  }

  if (appointmentQuery.isError || !appointmentQuery.data) {
    return (
      <Container py="xl">
        <Text c="red">Appointment not found.</Text>
      </Container>
    )
  }

  const appointment = appointmentQuery.data
  const linkedPrescription = prescriptionsQuery.data?.find((p) => p.appointment_id === appointment.id)

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Appointment #{appointment.id}</Title>
          <Badge color={STATUS_COLOR[appointment.status] ?? 'gray'} size="lg">
            {appointment.status}
          </Badge>
        </Group>

        <Card withBorder padding="md">
          <Stack gap="xs">
            <Text size="sm">
              {dayjs(appointment.start_time).format('MMM D, YYYY h:mm A')} –{' '}
              {dayjs(appointment.end_time).format('h:mm A')}
            </Text>
            <Text size="sm" c="dimmed">
              Mode: {appointment.consultation_mode}
            </Text>
            {appointment.notes && <Text size="sm">Notes: {appointment.notes}</Text>}
          </Stack>
        </Card>

        {appointment.status === 'pending' && (
          <Button color="red" variant="light" onClick={handleCancel} loading={cancelling}>
            Cancel Appointment
          </Button>
        )}

        {(appointment.status === 'confirmed' || appointment.status === 'completed') &&
          appointment.consultation_mode === 'video' && (
          <Card withBorder padding="md">
            <Stack gap="xs">
              <Title order={4}>Video Consultation</Title>
              {appointment.meeting_url ? (
                <Button component="a" href={appointment.meeting_url} target="_blank" rel="noreferrer">
                  {appointment.status === 'completed' ? 'Meeting Link' : 'Join Meeting'}
                </Button>
              ) : (
                <Alert color="yellow" variant="light">
                  The doctor hasn't shared a meeting link yet.
                </Alert>
              )}
            </Stack>
          </Card>
        )}

        {appointment.status === 'confirmed' && appointment.consultation_mode === 'chat' && (
          <Card withBorder padding="md">
            <Title order={4} mb="sm">
              Chat
            </Title>
            <ChatThread appointmentId={appointment.id} />
          </Card>
        )}

        {linkedPrescription && (
          <Card withBorder padding="md">
            <Title order={4} mb="xs">
              E-Prescription
            </Title>
            <a href={linkedPrescription.file_url} target="_blank" rel="noreferrer">
              {linkedPrescription.file_url}
            </a>
            {linkedPrescription.notes && (
              <Text size="sm" c="dimmed" mt={4}>
                {linkedPrescription.notes}
              </Text>
            )}
          </Card>
        )}
      </Stack>
    </Container>
  )
}
