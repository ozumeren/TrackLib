// frontend/src/pages/SettingsPage.jsx - İyileştirilmiş UX/UI
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  Title, Card, Stack, Text, Button, TextInput, Group,
  Paper, ThemeIcon, Alert, Badge, CopyButton, ActionIcon,
  Tooltip, Code, Divider, SimpleGrid, Accordion, Box, Tabs, Select
} from '@mantine/core';
import {
  IconSettings, IconKey, IconCode, IconShield,
  IconCheck, IconCopy, IconInfoCircle, IconAlertTriangle,
  IconBrandTelegram, IconBrandFacebook, IconBrandGoogle, IconScript
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function SettingsPage() {
  const { token } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState('');
  const [trackerType, setTrackerType] = useState('default');
  const [saving, setSaving] = useState(false);
  const [savingTracker, setSavingTracker] = useState(false);
  const API_BASE_URL = axios.defaults.baseURL;

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/customers/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomer(response.data);
        setTrackerType(response.data.trackerType || 'default');

        const domainsResponse = await axios.get('/api/customers/domains', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDomains((domainsResponse.data.domains || []).join('\n'));
      } catch (error) {
        console.error('Müşteri bilgileri alınamadı', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [token]);

  const handleSaveDomains = async () => {
    setSaving(true);
    try {
      const domainArray = domains
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);

      await axios.post(
        '/api/customers/domains',
        { domains: domainArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      notifications.show({
        title: 'Başarılı!',
        message: 'Domain ayarları kaydedildi.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: 'Hata!',
        message: 'Domain ayarları kaydedilemedi.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrackerType = async () => {
    setSavingTracker(true);
    try {
      await axios.put(
        '/api/customers/settings',
        { trackerType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      notifications.show({
        title: 'Başarılı!',
        message: 'Tracker tipi güncellendi. Değişikliğin etkili olması için sayfayı yenileyin.',
        color: 'teal',
        icon: <IconCheck size={16} />,
        autoClose: 5000,
      });

      // Refresh customer data
      const response = await axios.get('/api/customers/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomer(response.data);
    } catch (error) {
      notifications.show({
        title: 'Hata!',
        message: error.response?.data?.error || 'Tracker tipi güncellenemedi.',
        color: 'red',
        icon: <IconAlertTriangle size={16} />,
      });
    } finally {
      setSavingTracker(false);
    }
  };

  if (loading || !customer) {
    return <Text>Yükleniyor...</Text>;
  }

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <div>
          <Group spacing="xs" mb={4}>
            <ThemeIcon size="md" radius="md" variant="light" color="blue">
              <IconSettings size={20} />
            </ThemeIcon>
            <Title order={1} size="h2" weight={700}>
              Ayarlar
            </Title>
          </Group>
          <Text size="sm" color="dimmed">
            API anahtarlarınız ve entegrasyon ayarlarınız
          </Text>
        </div>
        <Badge size="lg" variant="dot" color="blue">
          {customer.name}
        </Badge>
      </Group>

      <Tabs defaultValue="api">
        <Tabs.List>
          <Tabs.Tab value="api" leftSection={<IconKey size={16} />}>
            API Anahtarları
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
            Güvenlik
          </Tabs.Tab>
          <Tabs.Tab value="integrations" leftSection={<IconCode size={16} />}>
            Entegrasyonlar
          </Tabs.Tab>
        </Tabs.List>

        {/* API Keys Tab */}
        <Tabs.Panel value="api" pt="md">
          <Stack spacing="md">
            {/* API Key */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                    <IconKey size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="md" weight={600}>
                      API Anahtarı
                    </Text>
                    <Text size="xs" color="dimmed">
                      Backend event tracking için
                    </Text>
                  </div>
                </Group>
                <Badge size="lg" color="green" variant="dot">
                  Aktif
                </Badge>
              </Group>

              <Paper p="md" radius="md" withBorder bg="gray.0">
                <Group position="apart">
                  <Code style={{ fontSize: 12, flex: 1 }}>{customer.apiKey}</Code>
                  <CopyButton value={customer.apiKey}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                        <ActionIcon
                          color={copied ? 'teal' : 'blue'}
                          onClick={copy}
                          variant="light"
                        >
                          {copied ? (
                            <IconCheck size={18} />
                          ) : (
                            <IconCopy size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>

              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
                mt="md"
              >
                <Text size="sm">
                  Bu anahtarı backend'inizden event göndermek için kullanın
                </Text>
              </Alert>

              {/* Kullanım Örneği */}
              <Accordion variant="contained" mt="md">
                <Accordion.Item value="usage">
                  <Accordion.Control icon={<IconCode size={16} />}>
                    💻 Kullanım Örneği
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Code block>
                      {`curl -X POST ${API_BASE_URL}/v1/events \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${customer.apiKey}",
    "session_id": "session_123",
    "player_id": "USER_456",
    "event_name": "deposit_successful",
    "parameters": {"amount": 100},
    "url": "https://yoursite.com/deposit"
  }'`}
                    </Code>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Card>

            {/* Script ID */}
            {customer.scriptId && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group position="apart" mb="md">
                  <Group spacing="sm">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      variant="light"
                      color="grape"
                    >
                      <IconCode size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="md" weight={600}>
                        Script ID
                      </Text>
                      <Text size="xs" color="dimmed">
                        Frontend tracker script için
                      </Text>
                    </div>
                  </Group>
                </Group>

                <Paper p="md" radius="md" withBorder bg="gray.0">
                  <Group position="apart">
                    <Code style={{ fontSize: 12, flex: 1 }}>
                      {customer.scriptId}
                    </Code>
                    <CopyButton value={customer.scriptId}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                          <ActionIcon
                            color={copied ? 'teal' : 'grape'}
                            onClick={copy}
                            variant="light"
                          >
                            {copied ? (
                              <IconCheck size={18} />
                            ) : (
                              <IconCopy size={18} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>

                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="grape"
                  variant="light"
                  mt="md"
                >
                  <Text size="sm">
                    Bu ID'yi frontend'inizde tracker script'i yüklemek için
                    kullanın
                  </Text>
                </Alert>

                <Accordion variant="contained" mt="md">
                  <Accordion.Item value="script">
                    <Accordion.Control icon={<IconCode size={16} />}>
                      📝 Script Kurulumu
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Code block>
                        {`<!-- HTML <head> bölümüne ekleyin -->
<script src="${API_BASE_URL}/c/${customer.scriptId}.js" async></script>

<script>
  // Kullanıcı girişi yaptığında
  window.addEventListener('strastix:ready', () => {
    strastix.identify("USER_ID");

    // Event gönderme
    strastix.track("deposit_successful", {
      amount: 100,
      currency: "TRY"
    });
  });
</script>`}
                      </Code>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Card>
            )}

            {/* Tracker Type Selection */}
            {customer.scriptId && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group position="apart" mb="md">
                  <Group spacing="sm">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      variant="light"
                      color="violet"
                    >
                      <IconScript size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="md" weight={600}>
                        Tracker Tipi
                      </Text>
                      <Text size="xs" color="dimmed">
                        Casino altyapınıza uygun tracker'ı seçin
                      </Text>
                    </div>
                  </Group>
                  <Badge
                    size="lg"
                    variant="dot"
                    color={trackerType === 'ebetlab' ? 'violet' : trackerType === 'pronet' ? 'blue' : 'gray'}
                  >
                    {trackerType === 'ebetlab' ? 'RONA' : trackerType === 'pronet' ? 'TRUVA' : 'DEFAULT'}
                  </Badge>
                </Group>

                <Select
                  label="Tracker Infrastructure"
                  description="Sitenizin kullandığı casino altyapısına göre tracker tipi seçin"
                  placeholder="Tracker tipi seçin"
                  value={trackerType}
                  onChange={setTrackerType}
                  data={[
                    { value: 'default', label: '🔷 Default - Generic Tracker (Universal)' },
                    { value: 'ebetlab', label: '🎰 EbetLab - RONA Infrastructure' },
                    { value: 'pronet', label: '🏢 Pronet - TRUVA Infrastructure' }
                  ]}
                  mb="md"
                />

                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="violet"
                  variant="light"
                  mb="md"
                >
                  <Stack spacing={4}>
                    <Text size="sm" weight={500}>
                      📌 Tracker Tipleri:
                    </Text>
                    <Text size="xs">
                      • <strong>Default:</strong> Tüm siteler için genel tracker
                    </Text>
                    <Text size="xs">
                      • <strong>EbetLab (RONA):</strong> Rona altyapısı (API interception)
                    </Text>
                    <Text size="xs">
                      • <strong>Pronet (TRUVA):</strong> Truva altyapısı (DOM-based tracking)
                    </Text>
                  </Stack>
                </Alert>

                <Group position="right">
                  <Button
                    onClick={handleSaveTrackerType}
                    loading={savingTracker}
                    leftSection={<IconCheck size={18} />}
                    color="violet"
                    disabled={trackerType === customer.trackerType}
                  >
                    Kaydet
                  </Button>
                </Group>

                {trackerType !== customer.trackerType && (
                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    color="orange"
                    variant="light"
                    mt="md"
                  >
                    <Text size="xs">
                      ⚠️ Değişiklik kaydedildikten sonra etkili olması için sitenizdeki
                      tracker script'i yeniden yüklenmelidir (sayfa yenileme).
                    </Text>
                  </Alert>
                )}
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Security Tab */}
        <Tabs.Panel value="security" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group spacing="sm" mb="md">
              <ThemeIcon size="lg" radius="md" variant="light" color="orange">
                <IconShield size={20} />
              </ThemeIcon>
              <div>
                <Text size="md" weight={600}>
                  İzin Verilen Domain'ler
                </Text>
                <Text size="xs" color="dimmed">
                  Tracker script'in çalışacağı domain'leri belirleyin
                </Text>
              </div>
            </Group>

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
              mb="md"
            >
              <Text size="sm" mb={4}>
                🔒 Güvenlik için önemli!
              </Text>
              <Text size="xs" color="dimmed">
                Her satıra bir domain yazın. Wildcard için *.example.com formatını
                kullanın.
              </Text>
            </Alert>

            <TextInput
              label="Domain Listesi"
              description="Her satıra bir domain (örn: example.com, *.subdomain.com)"
              placeholder={`example.com\n*.yoursite.com\nlocalhost`}
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              minRows={5}
              component="textarea"
              styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
            />

            {/* Örnek Domain'ler */}
            <Accordion variant="contained" mt="md">
              <Accordion.Item value="examples">
                <Accordion.Control icon={<IconInfoCircle size={16} />}>
                  📚 Domain Örnekleri
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="xs">
                    <Text size="xs">
                      <strong>Tek domain:</strong> <Code>example.com</Code>
                    </Text>
                    <Text size="xs">
                      <strong>Subdomain dahil:</strong> <Code>*.example.com</Code>
                    </Text>
                    <Text size="xs">
                      <strong>Localhost:</strong> <Code>localhost</Code>
                    </Text>
                    <Text size="xs">
                      <strong>IP Adresi:</strong> <Code>192.168.1.100</Code>
                    </Text>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Group position="right" mt="xl">
              <Button
                onClick={handleSaveDomains}
                loading={saving}
                leftSection={<IconCheck size={18} />}
              >
                Kaydet
              </Button>
            </Group>
          </Card>
        </Tabs.Panel>

        {/* Integrations Tab */}
        <Tabs.Panel value="integrations" pt="md">
          <Stack spacing="md">
            {/* Telegram */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                    <IconBrandTelegram size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="md" weight={600}>
                      Telegram Entegrasyonu
                    </Text>
                    <Text size="xs" color="dimmed">
                      Bildirimleri Telegram'dan alın
                    </Text>
                  </div>
                </Group>
                <Badge
                  color={customer?.telegramChatId ? 'green' : 'gray'}
                  variant="dot"
                >
                  {customer?.telegramChatId ? 'Aktif' : 'Pasif'}
                </Badge>
              </Group>

              {customer?.telegramChatId ? (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                  <Text size="sm">
                    Chat ID: <Code>{customer.telegramChatId}</Code>
                  </Text>
                </Alert>
              ) : (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="blue"
                  variant="light"
                >
                  <Text size="sm">
                    Telegram botunu henüz etkinleştirmediniz. Bildirim almak için
                    botu ekleyin.
                  </Text>
                </Alert>
              )}
            </Card>

            {/* Meta Ads */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                    <IconBrandFacebook size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="md" weight={600}>
                      Meta (Facebook) Ads
                    </Text>
                    <Text size="xs" color="dimmed">
                      Conversion API entegrasyonu
                    </Text>
                  </div>
                </Group>
                <Badge
                  color={customer?.metaPixelId ? 'green' : 'gray'}
                  variant="dot"
                >
                  {customer?.metaPixelId ? 'Aktif' : 'Pasif'}
                </Badge>
              </Group>

              {customer?.metaPixelId ? (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                  <Text size="sm">
                    Pixel ID yapılandırılmış
                  </Text>
                </Alert>
              ) : (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="blue"
                  variant="light"
                >
                  <Text size="sm">
                    Meta Ads entegrasyonu henüz ayarlanmamış
                  </Text>
                </Alert>
              )}
            </Card>

            {/* Google Ads */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Group spacing="sm">
                  <ThemeIcon size="lg" radius="md" variant="light" color="red">
                    <IconBrandGoogle size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="md" weight={600}>
                      Google Ads
                    </Text>
                    <Text size="xs" color="dimmed">
                      Google Analytics 4 entegrasyonu
                    </Text>
                  </div>
                </Group>
                <Badge
                  color={customer?.googleAdsId ? 'green' : 'gray'}
                  variant="dot"
                >
                  {customer?.googleAdsId ? 'Aktif' : 'Pasif'}
                </Badge>
              </Group>

              {customer?.googleAdsId ? (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                  <Text size="sm">
                    Measurement ID yapılandırılmış
                  </Text>
                </Alert>
              ) : (
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  color="blue"
                  variant="light"
                >
                  <Text size="sm">
                    Google Ads entegrasyonu henüz ayarlanmamış
                  </Text>
                </Alert>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export default SettingsPage;