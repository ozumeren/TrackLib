// frontend/src/pages/PlayerJourney.jsx - İyileştirilmiş UX/UI
import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Stack, Title, Loader, Alert, Group, Text, Card, Badge, Button,
  Timeline, ThemeIcon, Center, Paper, SimpleGrid, RingProgress,
  ScrollArea, Tabs, ActionIcon, Tooltip, Box, Divider, Avatar,
  Select, TextInput, SegmentedControl
} from '@mantine/core';
import { useAuth } from '../AuthContext';
import { translateEventName } from '../utils/eventTranslator';
import {
  IconArrowLeft, IconLogin, IconCoin, IconCheck, IconX,
  IconWallet, IconDeviceGamepad2, IconGift, IconActivity,
  IconCalendar, IconClock, IconTrendingUp, IconUser,
  IconFilter, IconSearch, IconChartLine, IconMapPin,
  IconBrandChrome, IconDeviceMobile, IconDeviceDesktop,
  IconExternalLink, IconDownload
} from '@tabler/icons-react';

// Gelişmiş event renkleri ve ikonlar
const eventMetadata = {
  login_successful: { color: 'green', icon: IconLogin, label: 'Giriş', category: 'auth' },
  logout: { color: 'gray', icon: IconX, label: 'Çıkış', category: 'auth' },
  registration_completed: { color: 'blue', icon: IconCheck, label: 'Kayıt', category: 'auth' },
  deposit_successful: { color: 'teal', icon: IconCoin, label: 'Para Yatırma', category: 'financial' },
  deposit_failed: { color: 'red', icon: IconX, label: 'Başarısız Yatırma', category: 'financial' },
  withdrawal_successful: { color: 'violet', icon: IconWallet, label: 'Para Çekme', category: 'financial' },
  withdrawal_failed: { color: 'red', icon: IconX, label: 'Başarısız Çekme', category: 'financial' },
  game_started: { color: 'grape', icon: IconDeviceGamepad2, label: 'Oyun Başladı', category: 'gaming' },
  bonus_requested: { color: 'yellow', icon: IconGift, label: 'Bonus Talebi', category: 'bonus' },
  page_view: { color: 'gray', icon: IconActivity, label: 'Sayfa Görüntüleme', category: 'navigation' },
  default: { color: 'gray', icon: IconActivity, label: 'Diğer', category: 'other' }
};

function PlayerJourney() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState('timeline');

  useEffect(() => {
    const fetchJourneyData = async () => {
      if (!token || !playerId) return;
      try {
        setLoading(true);
        const response = await axios.get(`/api/analytics/journey/${playerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setEvents(response.data);
        setFilteredEvents(response.data);
      } catch (err) {
        setError('Oyuncu verileri çekilirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchJourneyData();
  }, [token, playerId]);

  // Filtreleme mantığı
  useEffect(() => {
    let filtered = events;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(event => {
        const meta = eventMetadata[event.eventName] || eventMetadata.default;
        return meta.category === filterCategory;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.url && event.url.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredEvents(filtered);
  }, [filterCategory, searchQuery, events]);

  // İstatistikler
  const stats = {
    total: events.length,
    logins: events.filter(e => e.eventName === 'login_successful').length,
    deposits: events.filter(e => e.eventName === 'deposit_successful').length,
    withdrawals: events.filter(e => e.eventName === 'withdrawal_successful').length,
    totalDeposit: events
      .filter(e => e.eventName === 'deposit_successful')
      .reduce((sum, e) => sum + (e.parameters?.amount || 0), 0),
    totalWithdrawal: events
      .filter(e => e.eventName === 'withdrawal_successful')
      .reduce((sum, e) => sum + (e.parameters?.amount || 0), 0),
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getEventMetadata = (eventName) => {
    return eventMetadata[eventName] || eventMetadata.default;
  };

  const renderEventIcon = (event) => {
    const meta = getEventMetadata(event.eventName);
    const IconComponent = meta.icon;
    return (
      <ThemeIcon size={40} radius="xl" variant="light" color={meta.color}>
        <IconComponent size={20} />
      </ThemeIcon>
    );
  };

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">
            Oyuncu yolculuğu yükleniyor...
          </Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Hata!" icon={<IconX size={16} />}>
        {error}
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
            onClick={() => navigate('/')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Group spacing="xs" mb={4}>
              <ThemeIcon size="md" radius="md" variant="light" color="blue">
                <IconUser size={20} />
              </ThemeIcon>
              <Title order={1} size="h2">
                Oyuncu Yolculuğu
              </Title>
            </Group>
            <Group spacing="xs">
              <Text size="sm" color="dimmed">
                Oyuncu ID:
              </Text>
              <Badge size="lg" variant="light" color="blue">
                {playerId}
              </Badge>
            </Group>
          </div>
        </Group>

        <Group spacing="xs">
          <Button
            variant="light"
            leftSection={<IconUser size={16} />}
            onClick={() => navigate(`/player/${playerId}`)}
          >
            Profil Görüntüle
          </Button>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
          >
            Rapor İndir
          </Button>
        </Group>
      </Group>

      {/* İstatistik Kartları */}
      <SimpleGrid cols={4} breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 }
      ]}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                Toplam Event
              </Text>
              <Text size="xl" weight={700} mt="xs">
                {stats.total}
              </Text>
            </div>
            <RingProgress
              size={60}
              thickness={6}
              sections={[{ value: 100, color: 'blue' }]}
              label={
                <Center>
                  <IconActivity size={16} />
                </Center>
              }
            />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                Giriş Sayısı
              </Text>
              <Text size="xl" weight={700} mt="xs">
                {stats.logins}
              </Text>
            </div>
            <RingProgress
              size={60}
              thickness={6}
              sections={[{ value: (stats.logins / stats.total) * 100, color: 'green' }]}
              label={
                <Center>
                  <IconLogin size={16} />
                </Center>
              }
            />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                Toplam Yatırım
              </Text>
              <Text size="lg" weight={700} mt="xs" color="teal">
                {formatCurrency(stats.totalDeposit)}
              </Text>
              <Text size="xs" color="dimmed">
                {stats.deposits} işlem
              </Text>
            </div>
            <ThemeIcon size={60} radius="md" variant="light" color="teal">
              <IconCoin size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                Toplam Çekim
              </Text>
              <Text size="lg" weight={700} mt="xs" color="violet">
                {formatCurrency(stats.totalWithdrawal)}
              </Text>
              <Text size="xs" color="dimmed">
                {stats.withdrawals} işlem
              </Text>
            </div>
            <ThemeIcon size={60} radius="md" variant="light" color="violet">
              <IconWallet size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filtreler */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack spacing="md">
          <Group position="apart">
            <Text size="md" weight={600}>Filtreler</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
              }}
            >
              Filtreleri Temizle
            </Button>
          </Group>

          <Group grow>
            <TextInput
              placeholder="Event veya URL ara..."
              icon={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              placeholder="Kategori seç"
              icon={<IconFilter size={16} />}
              value={filterCategory}
              onChange={setFilterCategory}
              data={[
                { value: 'all', label: '🔹 Tümü' },
                { value: 'auth', label: '🔐 Kimlik Doğrulama' },
                { value: 'financial', label: '💰 Finansal' },
                { value: 'gaming', label: '🎮 Oyun' },
                { value: 'bonus', label: '🎁 Bonus' },
                { value: 'navigation', label: '🗺️ Navigasyon' },
              ]}
            />
          </Group>
        </Stack>
      </Card>

      {/* Görünüm Seçenekleri */}
      <Group position="apart">
        <Text size="lg" weight={600}>
          Event Akışı
          <Badge ml="xs" size="lg">
            {filteredEvents.length}
          </Badge>
        </Text>
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          data={[
            { label: 'Timeline', value: 'timeline' },
            { label: 'Tablo', value: 'table' }
          ]}
        />
      </Group>

      {/* Event Listesi */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {filteredEvents.length === 0 ? (
          <Center py="xl">
            <Stack align="center" spacing="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconActivity size={32} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600} mb="xs">
                  Event bulunamadı
                </Text>
                <Text size="sm" color="dimmed">
                  Seçilen filtrelere uygun event bulunmuyor
                </Text>
              </div>
            </Stack>
          </Center>
        ) : viewMode === 'timeline' ? (
          <ScrollArea style={{ height: 600 }}>
            <Timeline bulletSize={40} lineWidth={2}>
              {filteredEvents.map((event, index) => {
                const meta = getEventMetadata(event.eventName);
                const IconComponent = meta.icon;

                let displayUrl = event.url;
                try {
                  const urlObject = new URL(event.url);
                  displayUrl = urlObject.pathname;
                } catch (e) {
                  // Invalid URL
                }

                return (
                  <Timeline.Item
                    key={event.id}
                    bullet={<IconComponent size={18} />}
                    color={meta.color}
                    title={
                      <Group spacing="xs" mb="xs">
                        <Badge color={meta.color} variant="light">
                          {translateEventName(event.eventName)}
                        </Badge>
                        {event.parameters?.amount && (
                          <Badge color="dark" variant="filled">
                            {formatCurrency(event.parameters.amount)}
                          </Badge>
                        )}
                        {event.parameters?.method && (
                          <Badge color="gray" variant="outline">
                            {event.parameters.method}
                          </Badge>
                        )}
                      </Group>
                    }
                  >
                    <Stack spacing="xs">
                      <Group spacing="xs">
                        <IconClock size={14} />
                        <Text size="sm" color="dimmed">
                          {new Date(event.createdAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </Text>
                      </Group>

                      {event.url && (
                        <Group spacing="xs">
                          <IconMapPin size={14} />
                          <Tooltip label={event.url}>
                            <Text
                              size="sm"
                              color="dimmed"
                              style={{
                                maxWidth: 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {displayUrl}
                            </Text>
                          </Tooltip>
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            component="a"
                            href={event.url}
                            target="_blank"
                          >
                            <IconExternalLink size={14} />
                          </ActionIcon>
                        </Group>
                      )}

                      {event.parameters && Object.keys(event.parameters).length > 0 && (
                        <Box>
                          <Paper p="xs" radius="sm" withBorder>
                            <Text size="xs" weight={600} color="dimmed" mb={4}>
                              Parametreler:
                            </Text>
                            {Object.entries(event.parameters)
                              .filter(([key]) => !['amount', 'currency', 'method'].includes(key))
                              .map(([key, value]) => (
                                <Text key={key} size="xs" color="dimmed">
                                  • {key}: {JSON.stringify(value)}
                                </Text>
                              ))}
                          </Paper>
                        </Box>
                      )}
                    </Stack>

                    {index < filteredEvents.length - 1 && <Divider my="sm" />}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </ScrollArea>
        ) : (
          <ScrollArea>
            <Stack spacing="xs">
              {filteredEvents.map((event) => {
                const meta = getEventMetadata(event.eventName);
                
                return (
                  <Paper key={event.id} p="md" radius="md" withBorder>
                    <Group position="apart">
                      <Group spacing="md">
                        {renderEventIcon(event)}
                        <div>
                          <Group spacing="xs" mb={4}>
                            <Text weight={600}>{translateEventName(event.eventName)}</Text>
                            {event.parameters?.amount && (
                              <Badge color="dark" variant="filled">
                                {formatCurrency(event.parameters.amount)}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" color="dimmed">
                            {new Date(event.createdAt).toLocaleString('tr-TR')}
                          </Text>
                          {event.url && (
                            <Text size="xs" color="dimmed" mt={4}>
                              📍 {event.url}
                            </Text>
                          )}
                        </div>
                      </Group>
                      <Badge color={meta.color} variant="light">
                        {meta.label}
                      </Badge>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </ScrollArea>
        )}
      </Card>
    </Stack>
  );
}

export default PlayerJourney;