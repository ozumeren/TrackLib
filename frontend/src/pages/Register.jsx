import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Stack } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function RegisterPage() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      customerName: '',
      userName: '',
      email: '',
      password: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Geçersiz e-posta adresi'),
      password: (val) => (val.length >= 6 ? null : 'Şifre en az 6 karakter olmalıdır'),
    },
  });

  const handleSubmit = async (values) => {
    try {
      await axios.post('/api/auth/register', values);
      alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
      navigate('/login'); // Kayıt başarılı, giriş sayfasına yönlendir
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert(error.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ maxWidth: 420, margin: 'auto' }}>
      <Title align="center">Yeni Hesap Oluşturun</Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Zaten bir hesabınız var mı?{' '}
        <Anchor size="sm" component={Link} to="/login">
          Giriş Yapın
        </Anchor>
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Şirket Adı" placeholder="iGaming Şirketiniz" {...form.getInputProps('customerName')} />
          <TextInput required label="Adınız" placeholder="Adınız Soyadınız" {...form.getInputProps('userName')} />
          <TextInput required label="E-posta" placeholder="ornek@mail.com" {...form.getInputProps('email')} />
          <PasswordInput required label="Şifre" placeholder="Şifreniz" {...form.getInputProps('password')} />
          <Button fullWidth mt="xl" type="submit">
            Kayıt Ol
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

export default RegisterPage;
