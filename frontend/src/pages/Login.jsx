import { useForm } from '@mantine/form';
import { 
  TextInput, PasswordInput, Button, Paper, Title, Text, 
  Anchor, Stack, Alert, Container, Box, ThemeIcon, Group 
} from '@mantine/core';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { IconAlertCircle, IconChartBar, IconLock, IconMail } from '@tabler/icons-react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Geçersiz e-posta adresi'),
      password: (val) => (val.length <= 0 ? 'Şifre alanı boş bırakılamaz.' : null),
    },
  });

  const handleSubmit = async (values) => {
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', values);
      
      if (response.data && response.data.token) {
        auth.login(response.data);
        navigate('/');
      } else {
        setError('Giriş yapılamadı, sunucudan beklenmeyen yanıt.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <Container size={480}>
        <Stack spacing="xl">
          {/* Logo/Brand */}
          <Box style={{ textAlign: 'center' }}>
            <ThemeIcon size={80} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconChartBar size={40} />
            </ThemeIcon>
            <Title 
              order={1} 
              size="h2" 
              style={{ color: 'white', marginTop: 16 }}
            >
              TrackLib
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              iGaming Analytics Platform
            </Text>
          </Box>

          {/* Login Card */}
          <Paper 
            shadow="xl" 
            p={40} 
            radius="lg" 
            style={{ 
              background: 'white',
              border: 'none'
            }}
          >
            <Stack spacing="md">
              <div>
                <Title order={2} size="h3" weight={700}>
                  Hoş Geldiniz
                </Title>
                <Text size="sm" color="dimmed" mt={4}>
                  Hesabınıza giriş yapın ve analitik verilerinizi görüntüleyin
                </Text>
              </div>

              {error && (
                <Alert 
                  icon={<IconAlertCircle size={16} />} 
                  title="Giriş Başarısız" 
                  color="red"
                  radius="md"
                  variant="light"
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack spacing="md">
                  <TextInput
                    required
                    size="md"
                    label="E-posta"
                    placeholder="ornek@mail.com"
                    icon={<IconMail size={18} />}
                    {...form.getInputProps('email')}
                  />
                  
                  <PasswordInput
                    required
                    size="md"
                    label="Şifre"
                    placeholder="Şifrenizi girin"
                    icon={<IconLock size={18} />}
                    {...form.getInputProps('password')}
                  />

                  <Button 
                    fullWidth 
                    size="md" 
                    type="submit"
                    loading={loading}
                    radius="md"
                    style={{ marginTop: 8 }}
                  >
                    Giriş Yap
                  </Button>
                </Stack>
              </form>

              <Text size="sm" align="center" mt="md" color="dimmed">
                Hesabınız yok mu?{' '}
                <Anchor 
                  size="sm" 
                  component={RouterLink} 
                  to="/register"
                  weight={600}
                >
                  Ücretsiz Hesap Oluşturun
                </Anchor>
              </Text>
            </Stack>
          </Paper>

          {/* Footer */}
          <Text size="xs" align="center" style={{ color: 'rgba(255,255,255,0.7)' }}>
            © 2025 TrackLib. Tüm hakları saklıdır.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

export default LoginPage;