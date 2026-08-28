import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Container, Paper, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { getMyProfile, updateMyProfile } from '../../api/pharmacies'
import { ApiError } from '../../api/client'

export function PharmacyProfilePage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['pharmacies', 'me'], queryFn: getMyProfile })

  const form = useForm({
    initialValues: {
      store_name: '',
      license_number: '',
      drug_license_url: '',
      gstin: '',
      address: '',
    },
  })

  useEffect(() => {
    if (data) {
      form.setValues({
        store_name: data.store_name ?? '',
        license_number: data.license_number ?? '',
        drug_license_url: data.drug_license_url ?? '',
        gstin: data.gstin ?? '',
        address: data.address ?? '',
      })
    }
  }, [data])

  async function handleSubmit(values: typeof form.values) {
    try {
      await updateMyProfile(values)
      notifications.show({ color: 'green', message: 'Profile updated' })
      queryClient.invalidateQueries({ queryKey: ['pharmacies', 'me'] })
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
            <TextInput label="Store name" {...form.getInputProps('store_name')} />
            <TextInput label="License number" {...form.getInputProps('license_number')} />
            <TextInput label="Drug license URL" {...form.getInputProps('drug_license_url')} />
            <TextInput label="GSTIN" {...form.getInputProps('gstin')} />
            <TextInput label="Address" {...form.getInputProps('address')} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
