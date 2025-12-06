import { useForm } from '@mantine/form';
import {
  TextInput, PasswordInput, Button, Paper, Title, Text,
  Anchor, Stack, Alert, Container, Box, ThemeIcon, Stepper,
  Progress, List, ThemeIcon as ListIcon, Select
} from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconAlertCircle, IconChartBar, IconLock, IconMail,
  IconUser, IconBuildingStore, IconCode, IconCheck, IconServer
} from '@tabler/icons-react';
import axios from 'axios';
import { useState } from 'react';

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const form = useForm({
    initialValues: {
      customerName: '',
      scriptId: '',
      trackerType: 'default',  // 🆕 Tracker Type
      userName: '',
      email: '',
      password: '',
    },
    validate: {
      customerName: (val) => (val.length >= 2 ? null : 'Şirket adı en az 2 karakter olmalıdır'),
      scriptId: (val) => {
        if (!val) return 'Script ID zorunludur';
        if (!/^[a-z0-9_]+$/.test(val)) return 'Sadece küçük harf, rakam ve alt çizgi';
        if (val.length < 3 || val.length > 20) return '3-20 karakter arasında olmalı';
        return null;
      },
      trackerType: (val) => (!val ? 'Tracker tipi seçmelisiniz' : null),  // 🆕 Validation
      userName: (val) => (val.length >= 2 ? null : 'İsim en az 2 karakter olmalı'),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Geçersiz e-posta adresi'),
      password: (val) => {
        if (val.length < 8) return 'En az 8 karakter';
        if (!/[A-Z]/.test(val)) return 'En az 1 büyük harf';
        if (!/[0-9]/.test(val)) return 'En az 1 rakam';
        return null;
      },
    },
  });

  const handleSubmit = async (values) => {
    setError(null);
    setLoading(true);

    try {
      // 🐛 DEBUG: Log what we're sending
      const payload = {
        ...values,
        scriptId: `strastix_${values.scriptId}`
      };
      console.log('🚀 Registration Payload:', payload);

      await axios.post('/api/auth/register', payload);
      
      setStep(3); // Success step
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.values.password);

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
      <Container size={600}>
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
              TrackLib'e Katılın
            </Title>
            <Text size="sm" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              iGaming analitiğinde yeni bir dönem başlıyor
            </Text>
          </Box>

          {/* Register Card */}
          <Paper 
            shadow="xl" 
            p={40} 
            radius="lg"
            style={{ background: 'white' }}
          >
            {step === 3 ? (
              // Success State
              <Stack spacing="lg" align="center" py="xl">
                <ThemeIcon size={80} radius="xl" color="teal">
                  <IconCheck size={40} />
                </ThemeIcon>
                <Title order={2} size="h3">Kayıt Başarılı!</Title>
                <Text size="sm" color="dimmed" align="center">
                  Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...
                </Text>
              </Stack>
            ) : (
              <Stack spacing="lg">
                {/* Progress Stepper */}
                <Stepper active={step} size="sm" breakpoint="sm">
                  <Stepper.Step label="Şirket" description="Şirket bilgileri" />
                  <Stepper.Step label="Kullanıcı" description="Kişisel bilgiler" />
                  <Stepper.Step label="Güvenlik" description="Şifre oluştur" />
                </Stepper>

                {error && (
                  <Alert 
                    icon={<IconAlertCircle size={16} />} 
                    title="Hata" 
                    color="red"
                    variant="light"
                  >
                    {error}
                  </Alert>
                )}

                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack spacing="md">
                    {/* Step 0: Company Info */}
                    {step === 0 && (
                      <>
                        <TextInput
                          required
                          size="md"
                          label="Şirket Adı"
                          placeholder="Örn: Ronabet Casino"
                          icon={<IconBuildingStore size={18} />}
                          description="İşletmenizin adı"
                          {...form.getInputProps('customerName')}
                        />

                        <TextInput
                          required
                          size="md"
                          label="Script ID"
                          placeholder="ronabet"
                          icon={<IconCode size={18} />}
                          description="strastix_ öneki otomatik eklenecek (strastix_ronabet)"
                          {...form.getInputProps('scriptId')}
                        />

                        {/* 🆕 Tracker Type Selection */}
                        <Select
                          required
                          size="md"
                          label="Tracker Script Tipi"
                          placeholder="Altyapınıza uygun tracker'ı seçin"
                          icon={<IconServer size={18} />}
                          description="Her altyapı için özel optimizasyon"
                          data={[
                            { value: 'default', label: '🔹 Default - Genel amaçlı tracker' },
                            { value: 'pronet', label: '🎯 Pronet - Truva altyapısı için optimize edilmiş' },
                            { value: 'ebetlab', label: '🚀 Ebetlab - Rona altyapısı için optimize edilmiş' }
                          ]}
                          {...form.getInputProps('trackerType')}
                        />

                        <Button
                          fullWidth
                          size="md"
                          onClick={() => {
                            if (!form.errors.customerName && !form.errors.scriptId && !form.errors.trackerType) {
                              setStep(1);
                            } else {
                              form.validate();
                            }
                          }}
                        >
                          Devam Et
                        </Button>
                      </>
                    )}

                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                      <>
                        <TextInput
                          required
                          size="md"
                          label="Adınız Soyadınız"
                          placeholder="Eren Yılmaz"
                          icon={<IconUser size={18} />}
                          {...form.getInputProps('userName')}
                        />
                        
                        <TextInput
                          required
                          size="md"
                          label="E-posta"
                          placeholder="eren@ronabet.com"
                          icon={<IconMail size={18} />}
                          description="Giriş yaparken kullanacağınız e-posta"
                          {...form.getInputProps('email')}
                        />

                        <Button 
                          fullWidth 
                          size="md"
                          onClick={() => {
                            if (!form.errors.userName && !form.errors.email) {
                              setStep(2);
                            } else {
                              form.validate();
                            }
                          }}
                        >
                          Devam Et
                        </Button>
                        <Button 
                          fullWidth 
                          size="md"
                          variant="subtle"
                          onClick={() => setStep(0)}
                        >
                          Geri
                        </Button>
                      </>
                    )}

                    {/* Step 2: Security */}
                    {step === 2 && (
                      <>
                        <PasswordInput
                          required
                          size="md"
                          label="Şifre"
                          placeholder="Güçlü bir şifre oluşturun"
                          icon={<IconLock size={18} />}
                          {...form.getInputProps('password')}
                        />

                        <Box>
                          <Text size="xs" color="dimmed" mb={8}>Şifre Gücü</Text>
                          <Progress 
                            value={passwordStrength} 
                            color={
                              passwordStrength < 50 ? 'red' : 
                              passwordStrength < 75 ? 'yellow' : 'teal'
                            }
                            size="lg"
                            radius="xl"
                          />
                        </Box>

                        <Paper p="md" radius="md" withBorder bg="gray.0">
                          <Text size="sm" weight={500} mb="xs">Şifre Gereksinimleri:</Text>
                          <List size="xs" spacing="xs">
                            <List.Item 
                              icon={
                                <ListIcon size="sm" radius="xl" color={form.values.password.length >= 8 ? 'teal' : 'gray'}>
                                  <IconCheck size={12} />
                                </ListIcon>
                              }
                            >
                              En az 8 karakter
                            </List.Item>
                            <List.Item 
                              icon={
                                <ListIcon size="sm" radius="xl" color={/[A-Z]/.test(form.values.password) ? 'teal' : 'gray'}>
                                  <IconCheck size={12} />
                                </ListIcon>
                              }
                            >
                              En az 1 büyük harf
                            </List.Item>
                            <List.Item 
                              icon={
                                <ListIcon size="sm" radius="xl" color={/[0-9]/.test(form.values.password) ? 'teal' : 'gray'}>
                                  <IconCheck size={12} />
                                </ListIcon>
                              }
                            >
                              En az 1 rakam
                            </List.Item>
                          </List>
                        </Paper>

                        <Button 
                          fullWidth 
                          size="md"
                          type="submit"
                          loading={loading}
                        >
                          Hesap Oluştur
                        </Button>
                        <Button 
                          fullWidth 
                          size="md"
                          variant="subtle"
                          onClick={() => setStep(1)}
                        >
                          Geri
                        </Button>
                      </>
                    )}
                  </Stack>
                </form>

                <Text size="sm" align="center" mt="md" color="dimmed">
                  Zaten hesabınız var mı?{' '}
                  <Anchor 
                    size="sm" 
                    component={Link} 
                    to="/login"
                    weight={600}
                  >
                    Giriş Yapın
                  </Anchor>
                </Text>
              </Stack>
            )}
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

export default RegisterPage;