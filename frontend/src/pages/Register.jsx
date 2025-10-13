import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Paper, Title, Text, Anchor, Stack, Alert } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';
import { useState } from 'react';

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const form = useForm({
    initialValues: {
      customerName: '',
      scriptId: '', // YENİ: Script ID alanı
      userName: '',
      email: '',
      password: '',
    },
    validate: {
      customerName: (val) => (val.length >= 2 ? null : 'Şirket adı en az 2 karakter olmalıdır'),
      scriptId: (val) => {
        if (!val) return 'Script ID zorunludur';
        if (!/^[a-z0-9_]+$/.test(val)) return 'Sadece küçük harf, rakam ve alt çizgi kullanılabilir';
        if (val.length < 3 || val.length > 20) return 'Script ID 3-20 karakter arasında olmalıdır';
        return null;
      },
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Geçersiz e-posta adresi'),
      password: (val) => {
        if (val.length < 8) return 'Şifre en az 8 karakter olmalıdır';
        if (!/[A-Z]/.test(val)) return 'En az 1 büyük harf gerekli';
        if (!/[0-9]/.test(val)) return 'En az 1 rakam gerekli';
        return null;
      },
    },
  });

  const handleSubmit = async (values) => {
    setError(null);
    try {
      await axios.post('/api/auth/register', {
        ...values,
        scriptId: `pix_${values.scriptId}` // Otomatik prefix ekle
      });
      alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
      navigate('/login');
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ maxWidth: 480, margin: 'auto' }}>
      <Title align="center" order={2}>Yeni Hesap Oluşturun</Title>
      <Text color="dimmed" size="sm" align="center" mt={5}>
        Zaten bir hesabınız var mı?{' '}
        <Anchor size="sm" component={Link} to="/login">
          Giriş Yapın
        </Anchor>
      </Text>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red" mt="md">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="md" mt="xl">
          <TextInput 
            required 
            label="Şirket Adı" 
            placeholder="Örn: Ronabet Casino" 
            {...form.getInputProps('customerName')} 
          />
          
          <TextInput 
            required 
            label="Script ID" 
            placeholder="ronabet (pix_ otomatik eklenecek)"
            description="Müşterinizin sitesinde kullanacağınız benzersiz kimlik"
            {...form.getInputProps('scriptId')}
          />
          
          <TextInput 
            required 
            label="Adınız" 
            placeholder="Adınız Soyadınız" 
            {...form.getInputProps('userName')} 
          />
          
          <TextInput 
            required 
            label="E-posta" 
            placeholder="ornek@mail.com" 
            type="email"
            {...form.getInputProps('email')} 
          />
          
          <PasswordInput 
            required 
            label="Şifre" 
            placeholder="En az 8 karakter, 1 büyük harf, 1 rakam" 
            {...form.getInputProps('password')} 
          />
          
          <Button fullWidth mt="md" type="submit">
            Kayıt Ol
          </Button>
        </Stack>
      </form>

      <Alert color="blue" mt="xl" title="Script nasıl eklenir?">
        <Text size="sm">
          Kayıt sonrası müşterinize verilecek script satırı:
        </Text>
        <Text size="xs" mt="xs" style={{ 
          background: '#f1f3f5', 
          padding: '8px', 
          borderRadius: '4px',
          fontFamily: 'monospace' 
        }}>
          {`<script id="pix_${form.values.scriptId || 'yourscript'}" src="https://yourdomain.com/scripts/pix_${form.values.scriptId || 'yourscript'}.js" async></script>`}
        </Text>
      </Alert>
    </Paper>
  );
}

export default RegisterPage;