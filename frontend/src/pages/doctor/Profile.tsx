import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Container, Paper, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { getMyProfile, updateMyProfile } from '../../api/doctors'
import { ApiError } from '../../api/client'

export function DoctorProfilePage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['doctors', 'me'], queryFn: getMyProfile })

  const form = useForm({
    initialValues: {
      full_name: '',
      qualification: '',
      specialization: '',
      degree_doc_url: '',
      license_doc_url: '',
    },
  })

  useEffect(() => {
    if (data) {
      form.setValues({
        full_name: data.full_name ?? '',
        qualification: data.qualification ?? '',
        specialization: data.specialization ?? '',
        degree_doc_url: data.degree_doc_url ?? '',
        license_doc_url: data.license_doc_url ?? '',
      })
    }
  }, [data])

  async function handleSubmit(values: typeof form.values) {
    try {
      await updateMyProfile(values)
      notifications.show({ color: 'green', message: 'Profile updated' })
      queryClient.invalidateQueries({ queryKey: ['doctors', 'me'] })
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

      {data && !data.is_approved && (
        <Alert color="orange" variant="light" mb="md">
          Your account is pending Admin approval.
        </Alert>
      )}

      <Paper withBorder p="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Full name" {...form.getInputProps('full_name')} />
            <TextInput label="Qualification" {...form.getInputProps('qualification')} />
            <TextInput label="Specialization" {...form.getInputProps('specialization')} />
            <TextInput label="Degree document URL" {...form.getInputProps('degree_doc_url')} />
            <TextInput label="License document URL" {...form.getInputProps('license_doc_url')} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
