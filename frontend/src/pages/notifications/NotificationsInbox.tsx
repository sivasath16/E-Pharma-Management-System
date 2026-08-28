import { useQuery } from '@tanstack/react-query'
import { Badge, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import { listMyNotifications } from '../../api/notifications'

const TYPE_LABEL: Record<string, string> = {
  booking_confirmation: 'Booking Confirmation',
  prescription_uploaded: 'Prescription Uploaded',
  payment_receipt: 'Payment Receipt',
  order_status_update: 'Order Status Update',
  appointment_reminder: 'Appointment Reminder',
}

export function NotificationsInbox() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: listMyNotifications,
  })

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Notifications</Title>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load notifications.</Text>}
        {data && data.length === 0 && <Text c="dimmed">No notifications yet.</Text>}

        {data?.map((notification) => (
          <Card key={notification.id} withBorder padding="sm">
            <Stack gap={4}>
              <Group justify="space-between">
                <Text fw={600}>{notification.subject}</Text>
                <Group gap="xs">
                  <Badge variant="light" size="sm">
                    {notification.channel}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {dayjs(notification.sent_at).format('MMM D, h:mm A')}
                  </Text>
                </Group>
              </Group>
              <Text size="sm">{notification.message}</Text>
              <Text size="xs" c="dimmed">
                {TYPE_LABEL[notification.notification_type] ?? notification.notification_type}
              </Text>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
