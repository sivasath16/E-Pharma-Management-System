import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Container, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import { listMyPrescriptions, uploadPrescription } from '../../api/prescriptions'
import { ApiError } from '../../api/client'

export function Prescriptions() {
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['prescriptions', 'me'],
    queryFn: listMyPrescriptions,
  })

  const form = useForm({
    initialValues: { file_url: '', notes: '' },
    validate: {
      file_url: (value) => (value.trim() ? null : 'A file URL is required'),
    },
  })

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true)
    try {
      await uploadPrescription({ file_url: values.file_url, notes: values.notes || undefined })
      notifications.show({ color: 'green', message: 'Prescription uploaded' })
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'me'] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Upload failed'
      notifications.show({ color: 'red', title: 'Upload failed', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Prescriptions</Title>

        <Card withBorder padding="md">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                Enter a link to your prescription file (there's no file upload yet — paste a URL to an image or PDF).
              </Text>
              <TextInput label="File URL" placeholder="https://..." {...form.getInputProps('file_url')} />
              <TextInput label="Notes (optional)" {...form.getInputProps('notes')} />
              <Button type="submit" loading={submitting}>
                Upload
              </Button>
            </Stack>
          </form>
        </Card>

        {isLoading && <Loader />}
        {isError && <Text c="red">Failed to load prescriptions.</Text>}
        {data && data.length === 0 && <Text c="dimmed">No prescriptions uploaded yet.</Text>}

        {data?.map((prescription) => (
          <Card key={prescription.id} withBorder padding="sm">
            <Group justify="space-between">
              <Stack gap={2}>
                <a href={prescription.file_url} target="_blank" rel="noreferrer">
                  {prescription.file_url}
                </a>
                {prescription.notes && (
                  <Text size="sm" c="dimmed">
                    {prescription.notes}
                  </Text>
                )}
                {prescription.issued_by_doctor_id && (
                  <Text size="xs" c="blue">
                    Issued by doctor during a consultation
                  </Text>
                )}
              </Stack>
              <Text size="sm" c="dimmed">
                {dayjs(prescription.uploaded_at).format('MMM D, YYYY')}
              </Text>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  )
}
