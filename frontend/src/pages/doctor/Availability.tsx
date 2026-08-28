import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { createAvailabilitySlot, deleteAvailabilitySlot, getMyProfile, listAvailabilitySlots } from '../../api/doctors'
import { ApiError } from '../../api/client'

export function Availability() {
  const queryClient = useQueryClient()
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const profileQuery = useQuery({ queryKey: ['doctors', 'me'], queryFn: getMyProfile })
  const doctorId = profileQuery.data?.id

  const slotsQuery = useQuery({
    queryKey: ['availability-slots', doctorId, 'all'],
    queryFn: () => listAvailabilitySlots(doctorId!, { available_only: false }),
    enabled: doctorId !== undefined,
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['availability-slots', doctorId, 'all'] })
  }

  async function handleCreate() {
    if (!startTime || !endTime) {
      notifications.show({ color: 'red', message: 'Pick a start and end time' })
      return
    }
    setCreating(true)
    try {
      await createAvailabilitySlot({
        start_time: dayjs(startTime).toISOString(),
        end_time: dayjs(endTime).toISOString(),
      })
      notifications.show({ color: 'green', message: 'Slot created' })
      setStartTime(null)
      setEndTime(null)
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to create slot'
      notifications.show({ color: 'red', title: 'Create failed', message })
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(slotId: number) {
    setDeletingId(slotId)
    try {
      await deleteAvailabilitySlot(slotId)
      notifications.show({ color: 'green', message: 'Slot deleted' })
      refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to delete slot'
      notifications.show({ color: 'red', title: 'Delete failed', message })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Availability</Title>

        <Card withBorder padding="lg">
          <Stack>
            <DateTimePicker label="Start time" value={startTime} onChange={setStartTime} />
            <DateTimePicker label="End time" value={endTime} onChange={setEndTime} />
            <Button onClick={handleCreate} loading={creating}>
              Add Slot
            </Button>
          </Stack>
        </Card>

        {slotsQuery.isLoading && <Loader />}
        {slotsQuery.data && slotsQuery.data.length === 0 && <Text c="dimmed">No slots yet.</Text>}

        {slotsQuery.data?.map((slot) => (
          <Card key={slot.id} withBorder padding="sm">
            <Group justify="space-between">
              <Text size="sm">
                {dayjs(slot.start_time).format('MMM D, YYYY h:mm A')} – {dayjs(slot.end_time).format('h:mm A')}
              </Text>
              <Group gap="xs">
                <Badge color={slot.is_booked ? 'gray' : 'green'}>{slot.is_booked ? 'Booked' : 'Available'}</Badge>
                {!slot.is_booked && (
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    loading={deletingId === slot.id}
                    onClick={() => handleDelete(slot.id)}
                  >
                    Delete
                  </Button>
                )}
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
