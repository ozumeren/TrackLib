import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { 
  Title, Card, Button, Group, Alert, Stack, Text, 
  TextInput, ActionIcon, Badge 
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconPlus, IconTrash } from '@tabler/icons-react';

function DomainsPage() {
  const { token } = useAuth();
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [token]);

  const fetchDomains = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/customers/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDomains(response.data.domains || []);
    } catch (err) {
      setError('Domain listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    
    if (!trimmed) {
      setError('Domain boş olamaz');
      return;
    }

    // Basit domain validasyonu
    if (!/^(\*\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(trimmed)) {
      setError('Geçersiz domain formatı. Örnek: example.com veya *.example.com');
      return;
    }

    if (domains.includes(trimmed)) {
      setError('Bu domain zaten ekli');
      return;
    }

    setDomains([...domains, trimmed]);
    setNewDomain('');
    setError(null);
  };

  const handleRemoveDomain = (domain) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    try {
      await axios.put('/api/customers/domains', 
        { domains }, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Domain ayarları kaydedilemedi.');
    }
  };

  if (loading) return <Text>Yükleniyor...</Text>;

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Stack spacing="lg">
        <div>
          <Title order={2} mb="xs">🔒 İzin Verilen Domain'ler</Title>
          <Text size="sm" color="dimmed">
            Script'inizi sadece bu domain'lerden kullanılabilir hale getirin.
            Boş bırakırsanız tüm sitelerden erişilebilir (güvensiz).
          </Text>
        </div>

        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          <Text size="sm" weight={500} mb="xs">Wildcard Kullanımı</Text>
          <Text size="xs">
            <code>*.example.com</code> formatında yazarsanız tüm alt domainler (www.example.com, 
            app.example.com vb.) otomatik izin alır.
          </Text>
        </Alert>

        {/* Domain Ekleme Formu */}
        <Group>
          <TextInput
            placeholder="example.com veya *.example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
            style={{ flex: 1 }}
            error={error}
          />
          <Button 
            leftIcon={<IconPlus size={16} />} 
            onClick={handleAddDomain}
          >
            Ekle
          </Button>
        </Group>

        {/* Domain Listesi */}
        {domains.length > 0 ? (
          <Stack spacing="xs">
            {domains.map((domain) => (
              <Group 
                key={domain} 
                position="apart"
                style={{ 
                  padding: '12px', 
                  background: '#f8f9fa', 
                  borderRadius: '8px' 
                }}
              >
                <Group>
                  <Badge color={domain.startsWith('*.') ? 'blue' : 'green'}>
                    {domain.startsWith('*.') ? 'Wildcard' : 'Exact'}
                  </Badge>
                  <Text weight={500}>{domain}</Text>
                </Group>
                <ActionIcon 
                  color="red" 
                  variant="light"
                  onClick={() => handleRemoveDomain(domain)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        ) : (
          <Alert color="gray">
            Henüz domain eklemediniz. Tüm sitelerden erişim açık (güvensiz).
          </Alert>
        )}

        {success && (
          <Alert icon={<IconCheck size={16} />} color="green">
            Domain ayarları başarıyla kaydedildi!
          </Alert>
        )}

        <Button 
          fullWidth 
          size="lg" 
          onClick={handleSave}
          disabled={domains.length === 0}
        >
          Kaydet ({domains.length} domain)
        </Button>

        {/* Örnekler */}
        <Alert color="blue" title="Örnek Kullanımlar">
          <Stack spacing="xs">
            <Text size="xs">
              <code>example.com</code> → Sadece example.com izinli
            </Text>
            <Text size="xs">
              <code>*.example.com</code> → www.example.com, app.example.com, test.example.com hepsi izinli
            </Text>
            <Text size="xs">
              <code>example.com</code> + <code>*.example.com</code> → Hem ana domain hem alt domainler
            </Text>
          </Stack>
        </Alert>
      </Stack>
    </Card>
  );
}

export default DomainsPage;