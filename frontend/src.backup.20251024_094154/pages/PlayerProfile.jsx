// frontend/src/pages/PlayerProfile.jsx
import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
  Stack, Title, Card, Group, Text, Badge, Button, Loader,
  Alert, SimpleGrid, Progress, Timeline, ThemeIcon, Box,
  RingProgress, Center, Paper, Tabs, ScrollArea,
  Tooltip, Divider
} from '@mantine/core';
import {
  IconArrowLeft, IconTrendingUp, IconTrendingDown, IconCoin,
  IconWallet, IconGift, IconChartBar, IconCalendar, IconClock,
  IconDeviceGamepad2, IconLogin, IconActivity, IconAlertCircle,
  IconCheck, IconX, IconInfoCircle
} from '@tabler/icons-react';
import { useAuth } from '../AuthContext';
import { translateEventName } from '../utils/eventTranslator';

function PlayerProfile() {
  const { playerId } = useParams();
  const { token } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token || !playerId) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/player-profile/${playerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setProfileData(response.data);
      } catch (err) {
        setError('Profil verileri yüklenemedi.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token, playerId]);

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Profil yükleniyor...</Text>
        </Stack>
      </Center>
    );
  }

  if (error || !profileData) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Hata" color="red">
        {error}
      </Alert>
    );
  }

  const { overview, financial, gaming, activity, recentEvents } = profileData;

  // Heatmap için gün isimleri
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  // LTV badge rengi
  const getLtvColor = (ltv) => {
    if (ltv > 1000) return 'green';
    if (ltv > 0) return 'teal';
    if (ltv === 0) return 'gray';
    return 'red';
  };

  // Heatmap yoğunluk rengi
  const getHeatmapColor = (value, max) => {
    if (value === 0) return '#f8f9fa';
    const intensity = value / max;
    if (intensity > 0.7) return '#087f5b';
    if (intensity > 0.4) return '#20c997';
    if (intensity > 0.2) return '#63e6be';
    return '#c3fae8';
  };

  const maxHeatmapValue = Math.max(...activity.heatmapData.flat());

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <Group>
          <Button
            component={RouterLink}
            to="/"
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Dashboard
          </Button>
          <Button
            component={RouterLink}
            to={`/journey/${playerId}`}
            variant="light"
            leftSection={<IconClock size={16} />}
          >
            Basit Journey
          </Button>
          <Divider orientation="vertical" />
          <div>
            <Title order={2}>Oyuncu Profili</Title>
            <Text size="sm" color="dimmed">
              ID: {playerId}
            </Text>
          </div>
        </Group>
        
        <Badge
          size="xl"
          variant="gradient"
          gradient={{ from: getLtvColor(financial.ltv), to: 'cyan' }}
          leftSection={<IconTrendingUp size={16} />}
        >
          LTV: ₺{financial.ltv.toLocaleString('tr-TR')}
        </Badge>
      </Group>

      {/* Özet Kartlar */}
      <SimpleGrid cols={4} breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 }
      ]}>
        {/* Toplam Deposit */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="teal">
              <IconCoin size={24} />
            </ThemeIcon>
            <Badge color="teal">{financial.depositCount}</Badge>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Yatırım
          </Text>
          <Text size="xl" weight={700}>
            ₺{financial.totalDeposit.toLocaleString('tr-TR')}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            Ort: ₺{financial.avgDepositAmount.toLocaleString('tr-TR')}
          </Text>
        </Card>

        {/* Toplam Withdrawal */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="violet">
              <IconWallet size={24} />
            </ThemeIcon>
            <Badge color="violet">{financial.withdrawalCount}</Badge>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Çekim
          </Text>
          <Text size="xl" weight={700}>
            ₺{financial.totalWithdrawal.toLocaleString('tr-TR')}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            Net: ₺{financial.netBalance.toLocaleString('tr-TR')}
          </Text>
        </Card>

        {/* Bonuslar */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="yellow">
              <IconGift size={24} />
            </ThemeIcon>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Bonus
          </Text>
          <Text size="xl" weight={700}>
            ₺{financial.totalBonuses.toLocaleString('tr-TR')}
          </Text>
        </Card>

        {/* Aktivite */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="xs">
            <ThemeIcon size="xl" radius="md" variant="light" color="blue">
              <IconActivity size={24} />
            </ThemeIcon>
          </Group>
          <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
            Toplam Event
          </Text>
          <Text size="xl" weight={700}>
            {overview.totalEvents.toLocaleString('tr-TR')}
          </Text>
          <Text size="xs" color="dimmed" mt={4}>
            {overview.loginCount} giriş
          </Text>
        </Card>
      </SimpleGrid>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
            Genel Bakış
          </Tabs.Tab>
          <Tabs.Tab value="financial" leftSection={<IconCoin size={16} />}>
            Finansal
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
            Aktivite
          </Tabs.Tab>
          <Tabs.Tab value="timeline" leftSection={<IconClock size={16} />}>
            Zaman Çizelgesi
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
            {/* Genel Bilgiler */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="lg" weight={600} mb="md">Genel Bilgiler</Text>
              <Stack spacing="sm">
                <Group position="apart">
                  <Group spacing="xs">
                    <IconCalendar size={16} />
                    <Text size="sm" color="dimmed">İlk Görülme</Text>
                  </Group>
                  <Text size="sm" weight={500}>
                    {new Date(overview.firstSeen).toLocaleDateString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <IconClock size={16} />
                    <Text size="sm" color="dimmed">Son Aktivite</Text>
                  </Group>
                  <Text size="sm" weight={500}>
                    {new Date(overview.lastSeen).toLocaleString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <IconLogin size={16} />
                    <Text size="sm" color="dimmed">Toplam Giriş</Text>
                  </Group>
                  <Badge>{overview.loginCount}</Badge>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <IconActivity size={16} />
                    <Text size="sm" color="dimmed">Session Sayısı</Text>
                  </Group>
                  <Badge>{overview.uniqueSessions}</Badge>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <IconChartBar size={16} />
                    <Text size="sm" color="dimmed">Ort. Event/Session</Text>
                  </Group>
                  <Text size="sm" weight={500}>{overview.avgEventsPerSession}</Text>
                </Group>
              </Stack>
            </Card>

            {/* Oyun İstatistikleri */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="lg" weight={600} mb="md">
                <Group spacing="xs">
                  <IconDeviceGamepad2 size={20} />
                  <span>Oyun Aktivitesi</span>
                </Group>
              </Text>
              <Stack spacing="md">
                <Box>
                  <Group position="apart" mb={8}>
                    <Text size="sm">Toplam Oyun Oturumu</Text>
                    <Text size="lg" weight={700}>{gaming.totalGameSessions}</Text>
                  </Group>
                  <Progress
                    value={Math.min((gaming.totalGameSessions / 100) * 100, 100)}
                    color="grape"
                  />
                </Box>
                <Box>
                  <Text size="sm" color="dimmed" mb="xs">
                    Benzersiz Oyun Sayısı
                  </Text>
                  <Group>
                    <RingProgress
                      size={80}
                      thickness={8}
                      sections={[{ value: gaming.uniqueGames, color: 'blue' }]}
                      label={
                        <Center>
                          <Text size="lg" weight={700}>{gaming.uniqueGames}</Text>
                        </Center>
                      }
                    />
                    <Stack spacing={4}>
                      {gaming.favoriteGames.slice(0, 3).map((game, idx) => (
                        <Badge key={idx} size="sm" variant="light">
                          {game}
                        </Badge>
                      ))}
                    </Stack>
                  </Group>
                </Box>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Aktivite Isı Haritası */}
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
            <Text size="lg" weight={600} mb="md">Aktivite Isı Haritası</Text>
            <Text size="xs" color="dimmed" mb="md">
              Hangi gün ve saatlerde daha aktif?
            </Text>
            
            <ScrollArea>
              <Box style={{ minWidth: 800 }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, fontSize: 12 }}></th>
                      {Array.from({ length: 24 }, (_, i) => (
                        <th key={i} style={{ textAlign: 'center', padding: 4, fontSize: 10 }}>
                          {i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activity.heatmapData.map((dayData, dayIdx) => (
                      <tr key={dayIdx}>
                        <td style={{ padding: 8, fontSize: 12, fontWeight: 500 }}>
                          {dayNames[dayIdx]}
                        </td>
                        {dayData.map((value, hourIdx) => (
                          <Tooltip
                            key={hourIdx}
                            label={`${dayNames[dayIdx]} ${hourIdx}:00 - ${value} aktivite`}
                          >
                            <td
                              style={{
                                backgroundColor: getHeatmapColor(value, maxHeatmapValue),
                                padding: 12,
                                textAlign: 'center',
                                fontSize: 9,
                                cursor: 'pointer',
                                borderRadius: 4
                              }}
                            >
                              {value > 0 ? value : ''}
                            </td>
                          </Tooltip>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        {/* Financial Tab */}
        <Tabs.Panel value="financial" pt="md">
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
            {/* Deposit İşlemleri */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Text size="lg" weight={600}>Yatırımlar</Text>
                <Badge size="lg" color="teal">{financial.depositCount}</Badge>
              </Group>
              
              <Stack spacing="xs" mb="md">
                <Group position="apart">
                  <Text size="sm" color="dimmed">Toplam</Text>
                  <Text size="lg" weight={700} color="teal">
                    ₺{financial.totalDeposit.toLocaleString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Text size="sm" color="dimmed">Ortalama</Text>
                  <Text size="sm" weight={500}>
                    ₺{financial.avgDepositAmount.toLocaleString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Text size="sm" color="dimmed">Başarısız</Text>
                  <Badge color="red" variant="light">{financial.failedDeposits}</Badge>
                </Group>
              </Stack>

              <Divider my="sm" />

              <Text size="sm" weight={500} mb="xs">Ödeme Yöntemleri</Text>
              <Stack spacing={4}>
                {Object.entries(financial.paymentMethods).map(([method, count]) => (
                  <Group key={method} position="apart">
                    <Text size="xs" transform="capitalize">{method}</Text>
                    <Badge size="sm" variant="dot">{count}</Badge>
                  </Group>
                ))}
              </Stack>
            </Card>

            {/* Withdrawal İşlemleri */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart" mb="md">
                <Text size="lg" weight={600}>Çekimler</Text>
                <Badge size="lg" color="violet">{financial.withdrawalCount}</Badge>
              </Group>
              
              <Stack spacing="xs" mb="md">
                <Group position="apart">
                  <Text size="sm" color="dimmed">Toplam</Text>
                  <Text size="lg" weight={700} color="violet">
                    ₺{financial.totalWithdrawal.toLocaleString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Text size="sm" color="dimmed">Net Kar/Zarar</Text>
                  <Text
                    size="lg"
                    weight={700}
                    color={financial.netBalance >= 0 ? 'green' : 'red'}
                  >
                    ₺{financial.netBalance.toLocaleString('tr-TR')}
                  </Text>
                </Group>
                <Group position="apart">
                  <Text size="sm" color="dimmed">Başarısız</Text>
                  <Badge color="red" variant="light">{financial.failedWithdrawals}</Badge>
                </Group>
              </Stack>

              {/* LTV Progress */}
              <Divider my="sm" />
              <Text size="sm" weight={500} mb="xs">Lifetime Value</Text>
              <Box>
                <Group position="apart" mb={4}>
                  <Text size="xs" color="dimmed">Kâr Marjı</Text>
                  <Text size="xs" weight={500}>
                    {financial.totalDeposit > 0
                      ? ((financial.netBalance / financial.totalDeposit) * 100).toFixed(1)
                      : 0}%
                  </Text>
                </Group>
                <Progress
                  value={financial.totalDeposit > 0
                    ? Math.abs((financial.netBalance / financial.totalDeposit) * 100)
                    : 0}
                  color={financial.netBalance >= 0 ? 'green' : 'red'}
                />
              </Box>
            </Card>
          </SimpleGrid>

          {/* Son İşlemler */}
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
            <Text size="lg" weight={600} mb="md">Son İşlemler</Text>
            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
              <Box>
                <Text size="sm" weight={500} color="teal" mb="xs">Son Yatırımlar</Text>
                <Stack spacing="xs">
                  {financial.deposits.slice(0, 5).map((deposit, idx) => (
                    <Paper key={idx} p="xs" radius="sm" withBorder>
                      <Group position="apart">
                        <div>
                          <Text size="sm" weight={500}>
                            ₺{deposit.amount.toLocaleString('tr-TR')}
                          </Text>
                          <Text size="xs" color="dimmed">{deposit.method}</Text>
                        </div>
                        <Text size="xs" color="dimmed">
                          {new Date(deposit.date).toLocaleDateString('tr-TR')}
                        </Text>
                      </Group>
                    </Paper>
                  ))}
                  {financial.deposits.length === 0 && (
                    <Text size="sm" color="dimmed" align="center">Henüz yatırım yok</Text>
                  )}
                </Stack>
              </Box>

              <Box>
                <Text size="sm" weight={500} color="violet" mb="xs">Son Çekimler</Text>
                <Stack spacing="xs">
                  {financial.withdrawals.slice(0, 5).map((withdrawal, idx) => (
                    <Paper key={idx} p="xs" radius="sm" withBorder>
                      <Group position="apart">
                        <div>
                          <Text size="sm" weight={500}>
                            ₺{withdrawal.amount.toLocaleString('tr-TR')}
                          </Text>
                          <Text size="xs" color="dimmed">{withdrawal.method}</Text>
                        </div>
                        <Text size="xs" color="dimmed">
                          {new Date(withdrawal.date).toLocaleDateString('tr-TR')}
                        </Text>
                      </Group>
                    </Paper>
                  ))}
                  {financial.withdrawals.length === 0 && (
                    <Text size="sm" color="dimmed" align="center">Henüz çekim yok</Text>
                  )}
                </Stack>
              </Box>
            </SimpleGrid>
          </Card>
        </Tabs.Panel>

        {/* Activity Tab */}
        <Tabs.Panel value="activity" pt="md">
          <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
            {/* Event Dağılımı */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="lg" weight={600} mb="md">Event Dağılımı</Text>
              <Stack spacing="xs">
                {Object.entries(activity.eventTypes)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([eventName, count]) => {
                    const percentage = (count / overview.totalEvents) * 100;
                    return (
                      <Box key={eventName}>
                        <Group position="apart" mb={4}>
                          <Text size="sm">{translateEventName(eventName)}</Text>
                          <Text size="xs" color="dimmed">
                            {count} ({percentage.toFixed(1)}%)
                          </Text>
                        </Group>
                        <Progress value={percentage} size="sm" />
                      </Box>
                    );
                  })}
              </Stack>
            </Card>

            {/* Cihaz Dağılımı */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="lg" weight={600} mb="md">Cihaz Kullanımı</Text>
              <Center>
                <RingProgress
                  size={200}
                  thickness={20}
                  sections={[
                    {
                      value: (activity.deviceInfo.mobile / overview.totalEvents) * 100,
                      color: 'blue',
                      tooltip: `Mobil: ${activity.deviceInfo.mobile}`
                    },
                    {
                      value: (activity.deviceInfo.desktop / overview.totalEvents) * 100,
                      color: 'teal',
                      tooltip: `Masaüstü: ${activity.deviceInfo.desktop}`
                    },
                    {
                      value: (activity.deviceInfo.tablet / overview.totalEvents) * 100,
                      color: 'grape',
                      tooltip: `Tablet: ${activity.deviceInfo.tablet}`
                    }
                  ]}
                  label={
                    <Center>
                      <Stack spacing={0} align="center">
                        <Text size="xs" color="dimmed">Toplam</Text>
                        <Text size="lg" weight={700}>
                          {overview.totalEvents}
                        </Text>
                      </Stack>
                    </Center>
                  }
                />
              </Center>
              <Stack spacing="xs" mt="md">
                <Group position="apart">
                  <Group spacing="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: '#339af0'
                      }}
                    />
                    <Text size="sm">Mobil</Text>
                  </Group>
                  <Text size="sm" weight={500}>{activity.deviceInfo.mobile}</Text>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: '#20c997'
                      }}
                    />
                    <Text size="sm">Masaüstü</Text>
                  </Group>
                  <Text size="sm" weight={500}>{activity.deviceInfo.desktop}</Text>
                </Group>
                <Group position="apart">
                  <Group spacing="xs">
                    <Box
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: '#cc5de8'
                      }}
                    />
                    <Text size="sm">Tablet</Text>
                  </Group>
                  <Text size="sm" weight={500}>{activity.deviceInfo.tablet}</Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Günlük Aktivite Grafiği */}
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
            <Text size="lg" weight={600} mb="md">Son 30 Gün Aktivite</Text>
            <Box style={{ height: 200 }}>
              <svg width="100%" height="100%" viewBox="0 0 800 200">
                {activity.dailyActivity.map((day, idx) => {
                  const maxCount = Math.max(...activity.dailyActivity.map(d => d.count));
                  const height = maxCount > 0 ? (day.count / maxCount) * 160 : 0;
                  const x = (idx * 800) / 30;
                  
                  return (
                    <g key={idx}>
                      <rect
                        x={x}
                        y={180 - height}
                        width={24}
                        height={height}
                        fill="#339af0"
                        opacity={0.7}
                        rx={2}
                      />
                      <title>
                        {new Date(day.date).toLocaleDateString('tr-TR')}: {day.count} event
                      </title>
                    </g>
                  );
                })}
              </svg>
            </Box>
            <Group position="apart" mt="xs">
              <Text size="xs" color="dimmed">
                {new Date(activity.dailyActivity[0]?.date).toLocaleDateString('tr-TR')}
              </Text>
              <Text size="xs" color="dimmed">Bugün</Text>
            </Group>
          </Card>
        </Tabs.Panel>

        {/* Timeline Tab */}
        <Tabs.Panel value="timeline" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="lg" weight={600} mb="md">Son Aktiviteler</Text>
            
            {recentEvents.length > 0 ? (
              <Timeline bulletSize={24} lineWidth={2}>
                {recentEvents.map((event) => {
                  const eventColors = {
                    login_successful: 'green',
                    registration_completed: 'blue',
                    deposit_successful: 'teal',
                    deposit_failed: 'red',
                    withdrawal_successful: 'violet',
                    game_started: 'grape',
                    bonus_requested: 'yellow'
                  };

                  const eventIcons = {
                    login_successful: <IconLogin size={14} />,
                    registration_completed: <IconCheck size={14} />,
                    deposit_successful: <IconCoin size={14} />,
                    deposit_failed: <IconX size={14} />,
                    withdrawal_successful: <IconWallet size={14} />,
                    game_started: <IconDeviceGamepad2 size={14} />,
                    bonus_requested: <IconGift size={14} />
                  };

                  return (
                    <Timeline.Item
                      key={event.id}
                      bullet={eventIcons[event.eventName] || <IconActivity size={14} />}
                      color={eventColors[event.eventName] || 'gray'}
                      title={
                        <Group spacing="xs">
                          <Badge
                            size="sm"
                            color={eventColors[event.eventName] || 'gray'}
                            variant="light"
                          >
                            {translateEventName(event.eventName)}
                          </Badge>
                          {event.parameters?.amount && (
                            <Badge size="sm" variant="filled" color="dark">
                              ₺{event.parameters.amount}
                            </Badge>
                          )}
                        </Group>
                      }
                    >
                      <Text size="xs" color="dimmed" mt={4}>
                        {new Date(event.createdAt).toLocaleString('tr-TR')}
                      </Text>
                      {event.parameters && Object.keys(event.parameters).length > 0 && (
                        <Text size="xs" color="dimmed" mt={4}>
                          {Object.entries(event.parameters)
                            .filter(([key]) => !['amount', 'currency'].includes(key))
                            .slice(0, 2)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' • ')}
                        </Text>
                      )}
                      {event.url && (
                        <Text size="xs" color="dimmed" mt={2}>
                          📍 {new URL(event.url).pathname}
                        </Text>
                      )}
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            ) : (
              <Center py="xl">
                <Stack align="center" spacing="xs">
                  <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                    <IconInfoCircle size={24} />
                  </ThemeIcon>
                  <Text size="sm" color="dimmed">Henüz aktivite yok</Text>
                </Stack>
              </Center>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export default PlayerProfile;