import { useState } from 'react'
import { Anchor, Button, Container, Paper, PasswordInput, Stack, TextInput, Title, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { ApiError } from '../../api/client'

const ROLE_HOME: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  pharmacy: '/pharmacy',
  admin: '/admin',
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (value.includes('@') ? null : 'Enter a valid email'),
      password: (value) => (value.length > 0 ? null : 'Password is required'),
    },
  })

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true)
    try {
      const user = await login(values.email, values.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? ROLE_HOME[user.role] ?? '/')
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Login failed'
      notifications.show({ color: 'red', title: 'Login failed', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container size="xs" py="xl">
      <Title order={2} mb="md">
        Log in
      </Title>
      <Paper withBorder p="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Email" placeholder="you@example.com" {...form.getInputProps('email')} />
            <PasswordInput label="Password" {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting}>
              Log in
            </Button>
            <Text size="sm" c="dimmed">
              Don't have an account? <Anchor component={Link} to="/register">Register</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
