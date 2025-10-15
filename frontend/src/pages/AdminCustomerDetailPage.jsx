// frontend/src/pages/AdminCustomerDetailPage.jsx - İyileştirilmiş UX/UI
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  Title, Card, Loader, Alert, Group, Text, Stack, JsonInput,
  Button, Paper, ThemeIcon, Badge, Divider, Accordion, Code,
  Center, Box, Tabs
} from '@mantine/core';
import {
  IconAlertCircle, IconCheck, IconArrowLeft, IconCode,
  IconSettings, IconInfoCircle, IconDeviceFloppy, IconBuilding
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
          JSON.stringify(response.data.domConfig || {}, null, 2)
        );
      } catch (err) {
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
        message: 'Yapılandırma kaydedildi.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'JSON formatını kontrol edin.',
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
      <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">
        {error}
      </Alert>
    );
  }

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <Group spacing="sm">
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={18} />}
            onClick={() => navigate('/admin/customers')}
          >
            Geri
          </Button>
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconBuilding size={20} />
          </ThemeIcon>
          <div>
            <Title order={1} size="h2" weight={700}>
              {customer?.name}
            </Title>
            <Text size="sm" color="dimmed">
              Müşteri Yapılandırması
            </Text>
          </div>
        </Group>
        <Badge size="lg" variant="dot" color="blue">
          Müşteri #{id}
        </Badge>
      </Group>

      <Tabs defaultValue="config">
        <Tabs.List>
          <Tabs.Tab value="config" leftSection={<IconSettings size={16} />}>
            DOM Yapılandırması
          </Tabs.Tab>
          <Tabs.Tab value="info" leftSection={<IconInfoCircle size={16} />}>
            Bilgi & Örnekler
          </Tabs.Tab>
        </Tabs.List>

        {/* Configuration Tab */}
        <Tabs.Panel value="config" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm" weight={500} mb={4}>
                🎯 DOM Gözlemci Yapılandırması
              </Text>
              <Text size="xs" color="dimmed">
                Frontend tracker script'inin hangi DOM elementlerini izleyeceğini ve
                hangi event'leri tetikleyeceğini belirleyin.
              </Text>
            </Alert>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <JsonInput
                label="DOM Config (JSON)"
                description="Tracker script için özel DOM izleme kuralları"
                placeholder='{ "rules": [...] }'
                validationError="Geçersiz JSON formatı"
                formatOnBlur
                autosize
                minRows={15}
                value={domConfig}
                onChange={setDomConfig}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: 12,
                  },
                }}
              />

              <Group position="right" mt="xl">
                <Button variant="default" onClick={() => navigate('/admin/customers')}>
                  İptal
                </Button>
                <Button
                  leftSection={<IconDeviceFloppy size={18} />}
                  onClick={handleSave}
                  loading={saving}
                >
                  Kaydet
                </Button>
              </Group>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Info & Examples Tab */}
        <Tabs.Panel value="info" pt="md">
          <Stack spacing="md">
            {/* Nedir? */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group spacing="sm" mb="md">
                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                  <IconInfoCircle size={18} />
                </ThemeIcon>
                <Text size="md" weight={600}>
                  DOM Config Nedir?
                </Text>
              </Group>
              <Text size="sm" color="dimmed">
                DOM Config, tracker script'inin müşterinin web sitesinde hangi
                elementleri izleyeceğini ve hangi olaylarda event göndereceğini
                tanımlar. Bu sayede kod yazmadan özel tracking kuralları
                oluşturabilirsiniz.
              </Text>
            </Card>

            {/* Örnek 1: Button Click */}
            <Paper p="md" radius="md" withBorder>
              <Text size="sm" weight={600} mb="md">
                📌 Örnek 1: Buton Tıklama Tracking
              </Text>
              <Text size="xs" color="dimmed" mb="md">
                "Para Yatır" butonuna tıklanınca deposit_page_view event'i gönder
              </Text>
              <Code block>
                {`{
  "rules": [
    {
      "eventName": "deposit_page_view",
      "selector": "button.deposit-btn",
      "trigger": "click",
      "parameters": {
        "page": "deposit"
      }
    }
  ]
}`}
              </Code>
            </Paper>

            {/* Örnek 2: Form Submit */}
            <Paper p="md" radius="md" withBorder>
              <Text size="sm" weight={600} mb="md">
                📌 Örnek 2: Form Gönderimi
              </Text>
              <Text size="xs" color="dimmed" mb="md">
                Kayıt formu gönderilince registration_started event'i gönder
              </Text>
              <Code block>
                {`{
  "rules": [
    {
      "eventName": "registration_started",
      "selector": "#registration-form",
      "trigger": "submit",
      "parameters": {
        "form_type": "registration"
      }
    }
  ]
}`}
              </Code>
            </Paper>

            {/* Örnek 3: Page Load */}
            <Paper p="md" radius="md" withBorder>
              <Text size="sm" weight={600} mb="md">
                📌 Örnek 3: Sayfa Yükleme
              </Text>
              <Text size="xs" color="dimmed" mb="md">
                Bonus sayfası yüklenince page_view event'i gönder
              </Text>
              <Code block>
                {`{
  "rules": [
    {
      "eventName": "page_view",
      "selector": "body.bonus-page",
      "trigger": "load",
      "parameters": {
        "page_type": "bonus"
      }
    }
  ]
}`}
              </Code>
            </Paper>

            {/* Karmaşık Örnek */}
            <Paper p="md" radius="md" withBorder>
              <Text size="sm" weight={600} mb="md">
                📌 Örnek 4: Çoklu Kural
              </Text>
              <Text size="xs" color="dimmed" mb="md">
                Birden fazla tracking kuralı tanımlama
              </Text>
              <Code block>
                {`{
  "rules": [
    {
      "eventName": "deposit_page_view",
      "selector": "button.deposit",
      "trigger": "click"
    },
    {
      "eventName": "withdrawal_page_view",
      "selector": "button.withdraw",
      "trigger": "click"
    },
    {
      "eventName": "game_started",
      "selector": ".game-tile",
      "trigger": "click",
      "parameters": {
        "game_id": "data-game-id"
      }
    }
  ]
}`}
              </Code>
            </Paper>

            {/* Parametreler Açıklaması */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="md" weight={600} mb="md">
                📚 Parametre Açıklamaları
              </Text>
              <Stack spacing="xs">
                <Box>
                  <Code>eventName</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Gönderilecek event'in adı (örn: deposit_successful)
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Code>selector</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    CSS selector (örn: button.deposit-btn, #form-id, .class-name)
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Code>trigger</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Tetikleyici olay: click, submit, load, change, focus
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Code>parameters</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Event ile birlikte gönderilecek ek bilgiler (opsiyonel)
                  </Text>
                </Box>
              </Stack>
            </Card>

            {/* Best Practices */}
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
              <Text size="sm" weight={500} mb={4}>
                💡 En İyi Uygulamalar
              </Text>
              <Stack spacing={4}>
                <Text size="xs">
                  ✓ Benzersiz ve açıklayıcı selector'ler kullanın
                </Text>
                <Text size="xs">
                  ✓ Event isimlerini tutarlı tutun (snake_case)
                </Text>
                <Text size="xs">
                  ✓ Gereksiz tracking'den kaçının (performans)
                </Text>
                <Text size="xs">
                  ✓ Test ortamında önce test edin
                </Text>
              </Stack>
            </Alert>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export default AdminCustomerDetailPage;