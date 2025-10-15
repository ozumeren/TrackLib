import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { 
  Title, Card, TextInput, Button, Alert, 
  CopyButton, ActionIcon, Tooltip, Code, Stack, Text, 
  Group, Paper, ThemeIcon, Tabs, Divider, Badge, Box
} from '@mantine/core';
import { 
  IconCheck, IconCopy, IconAlertCircle, IconCode,
  IconBrandTelegram, IconBrandMeta, IconBrandGoogle,
  IconSettings, IconKey, IconRocket
} from '@tabler/icons-react';

function SettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/customers/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (err) {
      setError('Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      await axios.put('/api/customers/settings', settings, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Ayarlar güncellenemedi.');
    }
  };

  const scriptUrl = settings?.scriptId 
    ? `http://37.27.72.40:3000/scripts/${settings.scriptId}.js`
    : '';

  const integrationCode = settings?.scriptId
    ? `<script id="${settings.scriptId}" src="${scriptUrl}" async></script>`
    : '';

  if (loading) return (
    <Stack align="center" py="xl">
      <Text>Yükleniyor...</Text>
    </Stack>
  );

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <div>
          <Title order={1} size="h2" weight={700}>
            Ayarlar
          </Title>
          <Text size="sm" color="dimmed" mt={4}>
            Entegrasyon ve platform ayarlarını yönetin
          </Text>
        </div>
      </Group>

      <Tabs defaultValue="integration" variant="pills" radius="md">
        <Tabs.List>
          <Tabs.Tab value="integration" icon={<IconRocket size={16} />}>
            Entegrasyon
          </Tabs.Tab>
          <Tabs.Tab value="api" icon={<IconKey size={16} />}>
            API Anahtarları
          </Tabs.Tab>
          <Tabs.Tab value="platforms" icon={<IconSettings size={16} />}>
            Reklam Platformları
          </Tabs.Tab>
        </Tabs.List>

        {/* Integration Tab */}
        <Tabs.Panel value="integration" pt="xl">
          <Stack spacing="lg">
            {/* Quick Setup Guide */}
            <Card shadow="sm" p="lg" radius="md" withBorder>
              <Group mb="md">
                <ThemeIcon size="xl" radius="md" variant="light" color="blue">
                  <IconCode size={24} />
                </ThemeIcon>
                <div>
                  <Text size="lg" weight={600}>Script Entegrasyonu</Text>
                  <Text size="sm" color="dimmed">
                    Tek satır kod ile sitenize entegre edin
                  </Text>
                </div>
              </Group>

              <Stack spacing="md">
                {/* Script ID */}
                <Paper p="md" radius="md" withBorder bg="gray.0">
                  <Stack spacing="xs">
                    <Group position="apart">
                      <Text size="sm" weight={500}>Script ID</Text>
                      <Badge size="sm" variant="dot" color="green">Aktif</Badge>
                    </Group>
                    <Group>
                      <Code 
                        style={{ 
                          padding: '8px 16px', 
                          flex: 1,
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      >
                        {settings?.scriptId || 'Yükleniyor...'}
                      </Code>
                      <CopyButton value={settings?.scriptId || ''}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                            <ActionIcon 
                              size="lg" 
                              variant="light"
                              color={copied ? 'teal' : 'blue'} 
                              onClick={copy}
                            >
                              {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </Stack>
                </Paper>

                {/* Integration Code */}
                <Paper p="md" radius="md" withBorder bg="dark.9">
                  <Stack spacing="sm">
                    <Group position="apart">
                      <Text size="sm" weight={500} color="white">
                        📋 Entegrasyon Kodu
                      </Text>
                      <CopyButton value={integrationCode}>
                        {({ copied, copy }) => (
                          <Button 
                            size="xs"
                            variant="white"
                            leftIcon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            onClick={copy}
                          >
                            {copied ? 'Kopyalandı' : 'Kodu Kopyala'}
                          </Button>
                        )}
                      </CopyButton>
                    </Group>
                    <Code 
                      block 
                      style={{ 
                        background: '#1a1b1e',
                        color: '#00ff88',
                        padding: '16px',
                        fontSize: '13px',
                        fontFamily: 'Monaco, Courier, monospace',
                        borderRadius: '8px'
                      }}
                    >
                      {integrationCode}
                    </Code>
                  </Stack>
                </Paper>

                {/* Usage Instructions */}
                <Alert color="blue" variant="light" radius="md">
                  <Stack spacing="xs">
                    <Text size="sm" weight={600}>📖 Nasıl Kullanılır?</Text>
                    <Text size="sm">
                      1. Yukarıdaki kodu kopyalayın
                    </Text>
                    <Text size="sm">
                      2. Sitenizin <Code>&lt;head&gt;</Code> veya <Code>&lt;body&gt;</Code> bölümüne yapıştırın
                    </Text>
                    <Text size="sm">
                      3. Kullanıcı giriş yaptığında: <Code>igamingTracker.identify('USER_ID')</Code>
                    </Text>
                    <Text size="sm">
                      4. Para yatırma: <Code>igamingTracker.deposit(500, 'TRY')</Code>
                    </Text>
                  </Stack>
                </Alert>

                {/* Example Code */}
                <Paper p="md" radius="md" withBorder>
                  <Text size="sm" weight={500} mb="xs">💡 Kullanım Örneği</Text>
                  <Code block style={{ fontSize: '12px' }}>
{`<script>
  // Kullanıcı giriş yaptığında
  igamingTracker.identify('USER_123');
  
  // Para yatırma başarılı olduğunda
  igamingTracker.deposit(500, 'TRY', 'credit_card');
  
  // Para çekme
  igamingTracker.withdrawal(200, 'TRY');
</script>`}
                  </Code>
                </Paper>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* API Keys Tab */}
        <Tabs.Panel value="api" pt="xl">
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group mb="md">
              <ThemeIcon size="xl" radius="md" variant="light" color="grape">
                <IconKey size={24} />
              </ThemeIcon>
              <div>
                <Text size="lg" weight={600}>API Anahtarı</Text>
                <Text size="sm" color="dimmed">
                  Backend entegrasyonları için
                </Text>
              </div>
            </Group>

            <Paper p="md" radius="md" withBorder bg="gray.0">
              <Stack spacing="xs">
                <Text size="sm" color="dimmed">API Key (Gizli tutun)</Text>
                <Group>
                  <TextInput
                    value={settings?.apiKey || ''}
                    readOnly
                    style={{ flex: 1 }}
                    styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
                  />
                  <CopyButton value={settings?.apiKey || ''}>
                    {({ copied, copy }) => (
                      <Button 
                        variant="light"
                        color={copied ? 'teal' : 'blue'} 
                        onClick={copy}
                        leftIcon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      >
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              </Stack>
            </Paper>

            <Alert color="yellow" variant="light" mt="md">
              <Text size="sm">
                ⚠️ Bu anahtarı kimseyle paylaşmayın. Script tarafından otomatik kullanılır.
              </Text>
            </Alert>
          </Card>
        </Tabs.Panel>

        {/* Ad Platforms Tab */}
        <Tabs.Panel value="platforms" pt="xl">
          <form onSubmit={handleSubmit}>
            <Stack spacing="lg">
              {success && (
                <Alert icon={<IconCheck size={16} />} title="Başarılı!" color="green">
                  Ayarlar kaydedildi.
                </Alert>
              )}

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">
                  {error}
                </Alert>
              )}

              {/* Telegram */}
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Group mb="md">
                  <ThemeIcon size="xl" radius="md" color="blue">
                    <IconBrandTelegram size={24} />
                  </ThemeIcon>
                  <div>
                    <Text size="lg" weight={600}>Telegram Bot</Text>
                    <Text size="sm" color="dimmed">
                      Otomatik bildirimler için
                    </Text>
                  </div>
                </Group>
                
                <TextInput
                  label="Bot Token"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={settings?.telegramBotToken || ''}
                  onChange={(e) => setSettings({...settings, telegramBotToken: e.target.value})}
                  description="@BotFather'dan aldığınız token"
                />
              </Card>

              {/* Meta */}
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Group mb="md">
                  <ThemeIcon size="xl" radius="md" color="indigo">
                    <IconBrandMeta size={24} />
                  </ThemeIcon>
                  <div>
                    <Text size="lg" weight={600}>Meta (Facebook) Ads</Text>
                    <Text size="sm" color="dimmed">
                      Conversion API entegrasyonu
                    </Text>
                  </div>
                </Group>
                
                <Stack spacing="md">
                  <TextInput
                    label="Pixel ID"
                    placeholder="123456789012345"
                    value={settings?.metaPixelId || ''}
                    onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})}
                  />
                  <TextInput
                    label="Access Token"
                    placeholder="EAAxxxxxxxxxxxx"
                    value={settings?.metaAccessToken || ''}
                    onChange={(e) => setSettings({...settings, metaAccessToken: e.target.value})}
                    description="Meta Events Manager'dan alın"
                  />
                </Stack>
              </Card>

              {/* Google Ads */}
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Group mb="md">
                  <ThemeIcon size="xl" radius="md" color="red">
                    <IconBrandGoogle size={24} />
                  </ThemeIcon>
                  <div>
                    <Text size="lg" weight={600}>Google Ads</Text>
                    <Text size="sm" color="dimmed">
                      Measurement Protocol
                    </Text>
                  </div>
                </Group>
                
                <Stack spacing="md">
                  <TextInput
                    label="Ads ID"
                    placeholder="AW-123456789"
                    value={settings?.googleAdsId || ''}
                    onChange={(e) => setSettings({...settings, googleAdsId: e.target.value})}
                  />
                  <TextInput
                    label="API Secret"
                    placeholder="abcdef123456"
                    value={settings?.googleApiSecret || ''}
                    onChange={(e) => setSettings({...settings, googleApiSecret: e.target.value})}
                    description="Google Analytics'ten alın"
                  />
                </Stack>
              </Card>

              <Button 
                type="submit" 
                size="lg"
                fullWidth
                leftIcon={<IconCheck size={18} />}
              >
                Değişiklikleri Kaydet
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export default SettingsPage;