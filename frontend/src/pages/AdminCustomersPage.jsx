// frontend/src/pages/AdminCustomersPage.jsx - İyileştirilmiş Versiyon
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  Title, Card, Loader, Alert, Group, Text, Table, Badge,
  Stack, ThemeIcon, Center, Button, ActionIcon, Tooltip,
  TextInput, Paper, Box, CopyButton, Code, SimpleGrid
} from '@mantine/core';
import {
  IconAlertCircle, IconUsers, IconKey, IconSettings,
  IconCheck, IconCopy, IconSearch, IconBuilding,
  IconCode, IconShield, IconRefresh
} from '@tabler/icons-react';

function AdminCustomersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (err) {
      setError('Müşteri listesi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.apiKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.scriptId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = customers.reduce((sum, c) => sum + (c.userCount || 0), 0);

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Müşteriler yükleniyor...</Text>
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

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <div>
          <Group spacing="xs" mb={4}>
            <ThemeIcon size="md" radius="md" variant="light" color="red">
              <IconShield size={20} />
            </ThemeIcon>
            <Title order={1} size="h2" weight={700}>
              Admin Panel
            </Title>
          </Group>
          <Text size="sm" color="dimmed">
            Müşteri hesaplarını ve yapılandırmalarını yönetin
          </Text>
        </div>
        <Button
          leftSection={<IconRefresh size={18} />}
          onClick={fetchCustomers}
          variant="light"
        >
          Yenile
        </Button>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={3} breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 }
      ]}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="blue">
              <IconBuilding size={24} />
            </ThemeIcon>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Müşteri
          </Text>
          <Text size="xl" weight={700}>
            {customers.length}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            Aktif hesap
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="teal">
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Kullanıcı
          </Text>
          <Text size="xl" weight={700}>
            {totalUsers}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            Tüm müşterilerdeki kullanıcılar
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="grape">
              <IconCode size={24} />
            </ThemeIcon>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Script ID'leri
          </Text>
          <Text size="xl" weight={700}>
            {customers.filter(c => c.scriptId).length}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            Yapılandırılmış
          </Text>
        </Card>
      </SimpleGrid>

      {/* Search Bar */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <TextInput
          placeholder="Müşteri ara (isim, API Key, Script ID)..."
          icon={<IconSearch size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="md"
        />
      </Card>

      {/* Customers Table */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group position="apart" mb="md">
          <Text size="lg" weight={600}>Müşteri Listesi</Text>
          <Badge size="lg" variant="dot" color="blue">
            {filteredCustomers.length} Müşteri
          </Badge>
        </Group>

        {filteredCustomers.length > 0 ? (
          <Table highlightOnHover verticalSpacing="md">
            <thead>
              <tr>
                <th>Müşteri Adı</th>
                <th>API Key</th>
                <th>Script ID</th>
                <th>Kullanıcı Sayısı</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Group spacing="xs">
                      <ThemeIcon size="sm" radius="xl" variant="light" color="blue">
                        <IconBuilding size={14} />
                      </ThemeIcon>
                      <Text weight={500}>{customer.name}</Text>
                    </Group>
                  </td>
                  <td>
                    <Group spacing="xs">
                      <Code color="blue" style={{ fontSize: 11 }}>
                        {customer.apiKey.substring(0, 20)}...
                      </Code>
                      <CopyButton value={customer.apiKey}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                            <ActionIcon
                              color={copied ? 'teal' : 'gray'}
                              onClick={copy}
                              size="sm"
                            >
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                  </td>
                  <td>
                    {customer.scriptId ? (
                      <Group spacing="xs">
                        <Code color="grape" style={{ fontSize: 11 }}>
                          {customer.scriptId.substring(0, 16)}...
                        </Code>
                        <CopyButton value={customer.scriptId}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Kopyalandı!' : 'Kopyala'}>
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                onClick={copy}
                                size="sm"
                              >
                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    ) : (
                      <Badge size="sm" variant="light" color="gray">
                        Yok
                      </Badge>
                    )}
                  </td>
                  <td>
                    <Badge size="lg" variant="light" color="teal">
                      {customer.userCount || 0}
                    </Badge>
                  </td>
                  <td>
                    <Group position="right" spacing="xs">
                      <Tooltip label="Yapılandırmayı Düzenle">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => navigate(`/admin/customer/${customer.id}`)}
                        >
                          <IconSettings size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Center py="xl">
            <Stack align="center" spacing="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconUsers size={32} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600} mb={4}>
                  {searchQuery ? 'Müşteri bulunamadı' : 'Henüz müşteri yok'}
                </Text>
                <Text size="sm" color="dimmed">
                  {searchQuery
                    ? 'Arama kriterlerinize uygun müşteri bulunamadı'
                    : 'Sisteme henüz müşteri eklenmemiş'}
                </Text>
              </div>
            </Stack>
          </Center>
        )}
      </Card>

      {/* Info Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder bg="yellow.0">
        <Group spacing="md">
          <ThemeIcon size="lg" radius="md" variant="light" color="yellow">
            <IconKey size={24} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text size="xs" color="dimmed">
              • <strong>API Key:</strong> Backend event tracking için kullanılır<br />
              • <strong>Script ID:</strong> Frontend tracker script'i için benzersiz tanımlayıcı<br />
              • DOM yapılandırması müşteriye özel olarak ayarlanabilir<br />
              • Her müşterinin kendi izole veritabanı alanı vardır
            </Text>
          </div>
        </Group>
      </Card>
    </Stack>
  );
}

export default AdminCustomersPage;