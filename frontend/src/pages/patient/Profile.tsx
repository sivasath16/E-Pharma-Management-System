import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Container, Paper, Stack, Textarea, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { getMyProfile, updateMyProfile } from '../../api/patients'
import { ApiError } from '../../api/client'

export function PatientProfilePage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['patients', 'me'], queryFn: getMyProfile })

  const form = useForm({
    initialValues: { full_name: '', health_conditions: '', address: '' },
  })

  useEffect(() => {
    if (data) {
      form.setValues({
        full_name: data.full_name ?? '',
        health_conditions: data.health_conditions ?? '',
        address: data.address ?? '',
      })
    }
  }, [data])

  async function handleSubmit(values: typeof form.values) {
    try {
      await updateMyProfile(values)
      notifications.show({ color: 'green', message: 'Profile updated' })
      queryClient.invalidateQueries({ queryKey: ['patients', 'me'] })
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Update failed'
      notifications.show({ color: 'red', title: 'Update failed', message })
    }
  }

  if (isLoading) return null

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="md">
        My Profile
      </Title>
      <Paper withBorder p="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Full name" {...form.getInputProps('full_name')} />
            <Textarea label="Health conditions" {...form.getInputProps('health_conditions')} />
            <Textarea label="Address" {...form.getInputProps('address')} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
