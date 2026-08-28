import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Container, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { getAppointment, issuePrescription, updateAppointmentStatus } from '../../api/appointments'
import { ChatThread } from '../../components/ChatThread'
import { ApiError } from '../../api/client'
import type { AppointmentStatus } from '../../api/types'

const STATUS_COLOR: Record<string, string> = {
  pending: 'gray',
  confirmed: 'blue',
  rejected: 'red',
  cancelled: 'red',
  completed: 'green',
}

export function DoctorAppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const appointmentId = Number(id)
  const queryClient = useQueryClient()

  const [meetingUrl, setMeetingUrl] = useState('')
  const [updating, setUpdating] = useState(false)
  const [rxFileUrl, setRxFileUrl] = useState('')
  const [rxNotes, setRxNotes] = useState('')
  const [issuing, setIssuing] = useState(false)

  const appointmentQuery = useQuery({
    queryKey: ['appointments', appointmentId],
    queryFn: () => getAppointment(appointmentId),
    enabled: Number.isFinite(appointmentId),
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['appointments', appointmentId] })
  }

  async function handleStatusChange(status: AppointmentStatus) {
    setUpdating(true)
    try {
      await updateAppointmentStatus(appointmentId, {
        status,
        meeting_url: status === 'confirmed' && meetingUrl ? meetingUrl : undefined,
      })
      notifications.show({ color: 'green', message: `Appointment ${status}` })
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Update failed'
      notifications.show({ color: 'red', title: 'Update failed', message })
    } finally {
      setUpdating(false)
    }
  }

  async function handleIssuePrescription() {
    if (!rxFileUrl.trim()) {
      notifications.show({ color: 'red', message: 'A file URL is required' })
      return
    }
    setIssuing(true)
    try {
      await issuePrescription(appointmentId, { file_url: rxFileUrl, notes: rxNotes || undefined })
      notifications.show({ color: 'green', message: 'E-prescription issued' })
      setRxFileUrl('')
      setRxNotes('')
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to issue prescription'
      notifications.show({ color: 'red', title: 'Issue failed', message })
    } finally {
      setIssuing(false)
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
            {appointment.notes && <Text size="sm">Patient notes: {appointment.notes}</Text>}
          </Stack>
        </Card>

        {appointment.status === 'pending' && (
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Title order={4}>Respond to Request</Title>
              {appointment.consultation_mode === 'video' && (
                <TextInput
                  label="Meeting URL (optional, e.g. a Zoom/Meet link)"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.currentTarget.value)}
                />
              )}
              <Group>
                <Button loading={updating} onClick={() => handleStatusChange('confirmed')}>
                  Confirm
                </Button>
                <Button color="red" variant="light" loading={updating} onClick={() => handleStatusChange('rejected')}>
                  Reject
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {appointment.status === 'confirmed' && (
          <Button loading={updating} onClick={() => handleStatusChange('completed')}>
            Mark as Completed
          </Button>
        )}

        {appointment.status === 'confirmed' && appointment.consultation_mode === 'video' && appointment.meeting_url && (
          <Text size="sm">
            Meeting link:{' '}
            <a href={appointment.meeting_url} target="_blank" rel="noreferrer">
              {appointment.meeting_url}
            </a>
          </Text>
        )}

        {appointment.status === 'confirmed' && appointment.consultation_mode === 'chat' && (
          <Card withBorder padding="md">
            <Title order={4} mb="sm">
              Chat
            </Title>
            <ChatThread appointmentId={appointment.id} />
          </Card>
        )}

        {(appointment.status === 'confirmed' || appointment.status === 'completed') && (
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Title order={4}>Issue E-Prescription</Title>
              <TextInput
                label="File URL"
                placeholder="https://..."
                value={rxFileUrl}
                onChange={(e) => setRxFileUrl(e.currentTarget.value)}
              />
              <TextInput label="Notes (optional)" value={rxNotes} onChange={(e) => setRxNotes(e.currentTarget.value)} />
              <Button loading={issuing} onClick={handleIssuePrescription}>
                Issue Prescription
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  )
}
