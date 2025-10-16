// frontend/src/pages/AdminCustomerDetailPage.jsx - DomConfig Builder ile
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import DomConfigBuilder from '../components/DomConfigBuilder';
import {
  Title, Card, Loader, Alert, Group, Text, Stack,
  Button, Paper, ThemeIcon, Badge, Divider, Code,
  Center, Box, Tabs, CopyButton, ActionIcon, Tooltip
} from '@mantine/core';
import {
  IconAlertCircle, IconCheck, IconArrowLeft, IconCode,
  IconSettings, IconInfoCircle, IconDeviceFloppy, IconBuilding,
  IconKey, IconCopy, IconWand
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function AdminCustomerDetailPage() {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [domConfig, setDomConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!token || !id) return;
      try {
        const response = await axios.get(`/api/admin/customers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomer(response.data);
        setDomConfig(
          JSON.stringify(response.data.domConfig || { rules: [] }, null, 2)
        );
      } catch (err) {
        console.error('Customer fetch error:', err);
        setError('Müşteri detayları çekilemedi.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerDetails();
  }, [token, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedConfig = JSON.parse(domConfig);
      await axios.put(
        `/api/admin/customers/${id}/domconfig`,
        { domConfig: parsedConfig },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      notifications.show({
        title: 'Başarılı!',
        message: 'DOM yapılandırması kaydedildi.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'JSON formatını kontrol edin veya geçersiz yapılandırma.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">
            Müşteri detayları yükleniyor...
          </Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red" radius="md">
        {error}
      </Alert>
    );
  }

  if (!customer) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Bulunamadı" color="yellow" radius="md">
        Müşteri bulunamadı.
      </Alert>
    );
  }

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <Group spacing="md">
          <ActionIcon
            size="lg"
            variant="light"
            onClick={() => navigate('/admin/customers')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Group spacing="xs" mb={4}>
              <ThemeIcon size="md" radius="md" variant="light" color="blue">
                <IconBuilding size={20} />
              </ThemeIcon>
              <Title order={1} size="h2">
                {customer.name}
              </Title>
            </Group>
            <Text size="sm" color="dimmed">
              Müşteri Yapılandırma Paneli
            </Text>
          </div>
        </Group>

        <Button
          leftSection={<IconDeviceFloppy size={18} />}
          onClick={handleSave}
          loading={saving}
          size="md"
        >
          Kaydet
        </Button>
      </Group>

      {/* Müşteri Bilgileri */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text size="lg" weight={600} mb="md">
          Müşteri Bilgileri
        </Text>

        <Stack spacing="md">
          {/* API Key */}
          <Paper p="md" radius="sm" withBorder>
            <Group position="apart">
              <div>
                <Group spacing="xs" mb={4}>
                  <IconKey size={16} />
                  <Text size="sm" weight={500}>API Key</Text>
                </Group>
                <Code style={{ fontSize: 12 }}>{customer.apiKey}</Code>
              </div>
              <CopyButton value={customer.apiKey}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="light"
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Paper>

          {/* Script ID */}
          <Paper p="md" radius="sm" withBorder>
            <Group position="apart">
              <div>
                <Group spacing="xs" mb={4}>
                  <IconCode size={16} />
                  <Text size="sm" weight={500}>Script ID</Text>
                </Group>
                <Code style={{ fontSize: 12 }}>{customer.scriptId}</Code>
              </div>
              <CopyButton value={customer.scriptId}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="light"
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Paper>

          {/* Script URL */}
          <Paper p="md" radius="sm" withBorder>
            <Group position="apart">
              <div>
                <Group spacing="xs" mb={4}>
                  <IconCode size={16} />
                  <Text size="sm" weight={500}>Tracker Script URL</Text>
                </Group>
                <Code style={{ fontSize: 11 }}>
                  {`https://${window.location.host}/scripts/${customer.scriptId}.js`}
                </Code>
              </div>
              <CopyButton value={`https://${window.location.host}/scripts/${customer.scriptId}.js`}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                    <ActionIcon
                      color={copied ? 'teal' : 'gray'}
                      variant="light"
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Paper>

          {/* Kullanıcılar */}
          {customer.users && customer.users.length > 0 && (
            <Paper p="md" radius="sm" withBorder>
              <Text size="sm" weight={500} mb="xs">
                Kullanıcılar ({customer.users.length})
              </Text>
              <Stack spacing={4}>
                {customer.users.map((user) => (
                  <Group key={user.id} spacing="xs">
                    <Badge size="sm" variant="dot" color={user.role === 'admin' ? 'red' : 'blue'}>
                      {user.email}
                    </Badge>
                    {user.role === 'admin' && (
                      <Badge size="xs" color="red">Admin</Badge>
                    )}
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Card>

      {/* DOM Config Builder */}
      <Stack spacing="md">
        <Group spacing="xs">
          <ThemeIcon size="md" radius="md" variant="light" color="violet">
            <IconWand size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>
              DOM Yapılandırması
            </Text>
            <Text size="sm" color="dimmed">
              Tracker script'inin hangi elementleri izleyeceğini tanımlayın
            </Text>
          </div>
        </Group>

        <DomConfigBuilder
          value={domConfig}
          onChange={setDomConfig}
        />
      </Stack>

      {/* Kullanım Talimatları */}
      <Card shadow="sm" padding="lg" radius="md" withBorder bg="blue.0">
        <Group spacing="md" mb="md">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconInfoCircle size={24} />
          </ThemeIcon>
          <Text size="md" weight={600}>Kullanım Talimatları</Text>
        </Group>

        <Stack spacing="md">
          <div>
            <Text size="sm" weight={500} mb={4}>1. Tracker Script'i Web Sitenize Ekleyin:</Text>
            <Code block style={{ fontSize: 11 }}>
              {`<script src="https://${window.location.host}/scripts/${customer.scriptId}.js" async defer></script>`}
            </Code>
          </div>

          <div>
            <Text size="sm" weight={500} mb={4}>2. Oyuncu Kimliğini Bildirin (Giriş Sonrası):</Text>
            <Code block style={{ fontSize: 11 }}>
              {`<script>
  // Oyuncu giriş yaptıktan sonra
  window.igamingTracker.identify('PLAYER_ID_123');
</script>`}
            </Code>
          </div>

          <div>
            <Text size="sm" weight={500} mb={4}>3. Manuel Event Gönderimi (Opsiyonel):</Text>
            <Code block style={{ fontSize: 11 }}>
              {`<script>
  // Para yatırma başarılı
  window.igamingTracker.deposit(100, 'TRY', 'credit_card');
  
  // Para çekme
  window.igamingTracker.withdrawal(50, 'TRY', 'bank_transfer');
</script>`}
            </Code>
          </div>
        </Stack>
      </Card>
    </Stack>
  );
}

export default AdminCustomerDetailPage;