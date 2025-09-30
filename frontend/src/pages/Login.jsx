import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Stack } from '@mantine/core';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useState } from 'react';

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [error, setError] = useState(null);

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
    // --- YENİ HATA AYIKLAMA KODU ---
    console.log('[Login.jsx] Form gönderildi. Gönderilen veriler:', values);
    // --- HATA AYIKLAMA SONU ---
    try {
      const response = await axios.post('/api/auth/login', values);
      
      // --- YENİ HATA AYIKLAMA KODU ---
      console.log('[Login.jsx] API\'den başarılı yanıt alındı:', response.data);
      // --- HATA AYIKLAMA SONU ---
      
      if (response.data && response.data.token) {
        auth.login(response.data);
        navigate('/');
      } else {
        // --- YENİ HATA AYIKLAMA KODU ---
        console.error('[Login.jsx] API yanıtı başarılı ama jeton (token) bulunamadı.');
        // --- HATA AYIKLAMA SONU ---
        setError('Giriş yapılamadı, sunucudan beklenmeyen yanıt.');
      }
    } catch (err) {
      // --- YENİ HATA AYIKLAMA KODU ---
      console.error('[Login.jsx] API isteği sırasında hata oluştu:', err.response?.data || err.message);
      // --- HATA AYIKLAMA SONU ---
      setError(err.response?.data?.error || 'Giriş sırasında bir hata oluştu.');
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ maxWidth: 420, margin: 'auto' }}>
      <Title align="center">Panele Giriş Yap</Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Hesabınız yok mu?{' '}
        <Anchor size="sm" component={RouterLink} to="/register">
          Hesap Oluşturun
        </Anchor>
      </Text>

      {error && <Text color="red" size="sm" mt="md">{error}</Text>}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="E-posta"
            placeholder="ornek@mail.com"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            required
            label="Şifre"
            placeholder="Şifreniz"
            {...form.getInputProps('password')}
          />
          <Button fullWidth mt="xl" type="submit">
            Giriş Yap
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

export default LoginPage;

