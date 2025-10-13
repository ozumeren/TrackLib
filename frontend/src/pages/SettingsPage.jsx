import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { 
  Title, Card, TextInput, Button, Group, Alert, 
  CopyButton, ActionIcon, Tooltip, Code, Stack, Text 
} from '@mantine/core';
import { IconCheck, IconCopy, IconAlertCircle } from '@tabler/icons-react';

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
    ? `https://yourdomain.com/scripts/${settings.scriptId}.js`
    : '';

  const integrationCode = settings?.scriptId
    ? `<script id="${settings.scriptId}" src="${scriptUrl}" async></script>`
    : '';

  if (loading) return <Text>Yükleniyor...</Text>;

  return (
    <Stack spacing="lg">
      {/* SCRIPT ENTEGRASYON KARTI */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Title order={2} mb="md">🚀 Script Entegrasyonu</Title>
        
        <Stack spacing="md">
          <div>
            <Text size="sm" weight={500} mb="xs">Script ID</Text>
            <Group>
              <Code style={{ padding: '8px 12px' }}>{settings?.scriptId || 'Yükleniyor...'}</Code>
              <CopyButton value={settings?.scriptId || ''}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                    <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </div>

          <div>
            <Text size="sm" weight={500} mb="xs">Script URL</Text>
            <Group>
              <Code style={{ padding: '8px 12px', flex: 1, overflow: 'auto' }}>{scriptUrl}</Code>
              <CopyButton value={scriptUrl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                    <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </div>

          <div>
            <Text size="sm" weight={500} mb="xs">Entegrasyon Kodu (Müşterinize Verin)</Text>
            <Alert color="blue" icon={<IconAlertCircle size={16} />}>
              <Text size="xs" mb="xs">
                Müşteriniz bu kodu sitenin <Code>&lt;head&gt;</Code> veya <Code>&lt;body&gt;</Code> kısmına eklemeli:
              </Text>
              <Group>
                <Code 
                  block 
                  style={{ 
                    padding: '12px', 
                    flex: 1, 
                    background: '#1a1b1e',
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                >
                  {integrationCode}
                </Code>
                <CopyButton value={integrationCode}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                      <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} size="lg">
                        {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Alert>
          </div>

          <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
            <Text size="sm" weight={500} mb="xs">Kullanıcı Kimliği Nasıl Gönderilir?</Text>
            <Text size="xs" mb="xs">
              Kullanıcı giriş yaptıktan sonra, müşteriniz bu kodu eklemeli:
            </Text>
            <Code 
              block 
              style={{ 
                padding: '12px',
                background: '#1a1b1e',
                color: '#00ff00',
                fontFamily: 'monospace',
                fontSize: '11px'
              }}
            >
{`<script>
  // Kullanıcı giriş yaptığında
  if (window.igamingTracker) {
    igamingTracker.identify('USER_ID_123');
  }
  
  // Para yatırma
  igamingTracker.deposit(500, 'TRY', 'credit_card');
  
  // Para çekme
  igamingTracker.withdrawal(200, 'TRY', 'bank_transfer');
</script>`}
            </Code>
          </Alert>
        </Stack>
      </Card>

      {/* API KEY KARTI */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Title order={2} mb="md">🔑 API Anahtarı</Title>
        <Group>
          <TextInput
            value={settings?.apiKey || ''}
            readOnly
            style={{ flex: 1 }}
            description="Bu anahtar script'iniz tarafından otomatik kullanılır"
          />
          <CopyButton value={settings?.apiKey || ''}>
            {({ copied, copy }) => (
              <Button 
                color={copied ? 'teal' : 'blue'} 
                onClick={copy}
                leftIcon={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              >
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Card>

      {/* TELEGRAM BOT KARTI */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            <Title order={2}>📱 Telegram Bot Ayarları</Title>
            
            <TextInput
              label="Telegram Bot Token"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={settings?.telegramBotToken || ''}
              onChange={(e) => setSettings({...settings, telegramBotToken: e.target.value})}
              description="BotFather'dan aldığınız bot token'ı"
            />

            <Title order={2} mt="md">📊 Reklam Platformları</Title>

            <TextInput
              label="Meta (Facebook) Pixel ID"
              placeholder="123456789012345"
              value={settings?.metaPixelId || ''}
              onChange={(e) => setSettings({...settings, metaPixelId: e.target.value})}
            />

            <TextInput
              label="Meta Access Token"
              placeholder="EAAxxxxxxxxxxxx"
              value={settings?.metaAccessToken || ''}
              onChange={(e) => setSettings({...settings, metaAccessToken: e.target.value})}
              description="Meta Events Manager'dan alın"
            />

            <TextInput
              label="Google Ads ID"
              placeholder="AW-123456789"
              value={settings?.googleAdsId || ''}
              onChange={(e) => setSettings({...settings, googleAdsId: e.target.value})}
            />

            <TextInput
              label="Google API Secret"
              placeholder="abcdef123456"
              value={settings?.googleApiSecret || ''}
              onChange={(e) => setSettings({...settings, googleApiSecret: e.target.value})}
              description="Google Analytics'ten alın"
            />

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

            <Button type="submit" fullWidth>
              Ayarları Kaydet
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}

export default SettingsPage;