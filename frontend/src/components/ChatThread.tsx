import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Group, Paper, ScrollArea, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { listMessages, sendMessage } from '../api/appointments'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

export function ChatThread({ appointmentId }: { appointmentId: number }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const { data } = useQuery({
    queryKey: ['messages', appointmentId],
    queryFn: () => listMessages(appointmentId),
    refetchInterval: 4000,
  })

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    try {
      await sendMessage(appointmentId, { body })
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['messages', appointmentId] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Failed to send message'
      notifications.show({ color: 'red', title: 'Message not sent', message })
    } finally {
      setSending(false)
    }
  }

  return (
    <Stack gap="sm">
      <ScrollArea h={240} type="auto">
        <Stack gap="xs">
          {data?.map((message) => {
            const mine = message.sender_user_id === user?.id
            return (
              <Paper
                key={message.id}
                withBorder
                p="xs"
                maw="75%"
                ml={mine ? 'auto' : 0}
                bg={mine ? 'blue.0' : undefined}
              >
                <Text size="sm">{message.body}</Text>
                <Text size="xs" c="dimmed">
                  {dayjs(message.sent_at).format('h:mm A')}
                </Text>
              </Paper>
            )
          })}
          {data && data.length === 0 && (
            <Text size="sm" c="dimmed">
              No messages yet.
            </Text>
          )}
        </Stack>
      </ScrollArea>
      <Group>
        <TextInput
          flex={1}
          placeholder="Type a message..."
          value={body}
          onChange={(e) => setBody(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} loading={sending}>
          Send
        </Button>
      </Group>
    </Stack>
  )
}
