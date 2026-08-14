import { useState } from 'react'
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  TextInput,
  Title,
  Text,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate } from 'react-router-dom'
import * as authApi from '../../api/auth'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'
import type { UserRole } from '../../api/types'

const ROLE_HOME: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  pharmacy: '/pharmacy',
  admin: '/admin',
}

export function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    initialValues: {
      role: 'patient' as UserRole,
      email: '',
      password: '',
      phone: '',
      full_name: '',
      store_name: '',
      license_number: '',
    },
    validate: {
      email: (value) => (value.includes('@') ? null : 'Enter a valid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
    },
  })

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true)
    try {
      await authApi.register({
        email: values.email,
        password: values.password,
        role: values.role,
        phone: values.phone || undefined,
        full_name: values.role !== 'pharmacy' ? values.full_name || undefined : undefined,
        store_name: values.role === 'pharmacy' ? values.store_name || undefined : undefined,
        license_number: values.role === 'pharmacy' ? values.license_number || undefined : undefined,
      })

      const user = await login(values.email, values.password)

      if (values.role === 'doctor' || values.role === 'pharmacy') {
        notifications.show({
          color: 'blue',
          title: 'Registered',
          message: 'Your account is pending Admin approval before it becomes fully active.',
        })
      }
      navigate(ROLE_HOME[user.role] ?? '/')
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Registration failed'
      notifications.show({ color: 'red', title: 'Registration failed', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="xs" py="xl">
      <Title order={2} mb="md">
        Register
      </Title>
      <Paper withBorder p="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <SegmentedControl
              fullWidth
              data={[
                { label: 'Patient', value: 'patient' },
                { label: 'Doctor', value: 'doctor' },
                { label: 'Pharmacy', value: 'pharmacy' },
              ]}
              {...form.getInputProps('role')}
            />

            <TextInput label="Email" placeholder="you@example.com" {...form.getInputProps('email')} />
            <PasswordInput label="Password" {...form.getInputProps('password')} />
            <TextInput label="Phone (optional)" {...form.getInputProps('phone')} />

            {form.values.role !== 'pharmacy' ? (
              <TextInput label="Full name" {...form.getInputProps('full_name')} />
            ) : (
              <>
                <TextInput label="Store name" {...form.getInputProps('store_name')} />
                <TextInput label="License number" {...form.getInputProps('license_number')} />
              </>
            )}

            {(form.values.role === 'doctor' || form.values.role === 'pharmacy') && (
              <Text size="sm" c="dimmed">
                Doctor and Pharmacy accounts require Admin approval before they become fully active.
              </Text>
            )}

            <Button type="submit" loading={submitting}>
              Register
            </Button>
            <Text size="sm" c="dimmed">
              Already have an account? <Anchor component={Link} to="/login">Log in</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
