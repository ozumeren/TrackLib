import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { 
  Stack, Title, Card, SimpleGrid, Group, Loader, Alert, Text, 
  TextInput, Button, Badge, ThemeIcon, Box, Paper, Progress,
  ActionIcon, Tooltip, RingProgress, Center
} from '@mantine/core';
import { useAuth } from '../AuthContext';
import DashboardChart from '../components/DashboardChart';
import LiveEventFeed from '../components/LiveEventFeed';
import FraudStatsCard from '../components/FraudStatsCard';
import { 
  IconSearch, IconUsers, IconCoin, IconTrendingUp, 
  IconUserPlus, IconArrowUpRight, IconArrowDownRight,
  IconActivity, IconChartBar, IconInfoCircle
} from '@tabler/icons-react';

function Dashboard() {
  const { token, loading: authLoading } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [summaryRes, chartRes] = await Promise.all([
          axios.get('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
          axios.get('/api/analytics/timeseries?days=7', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        setSummaryData(summaryRes.data.last_24_hours);
        setChartData(chartRes.data);
      } catch (err) { 
        console.error('Dashboard data fetch error:', err);
        setError('Veri çekilirken bir hata oluştu.');
      } finally { 
        setLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchData();
    }
  }, [token, authLoading]);

  const handleSearch = () => {
    if (searchId.trim()) {
      navigate(`/journey/${searchId.trim()}`);
    }
  };

  if (loading) return (
    <Center style={{ height: '70vh' }}>
      <Stack align="center" spacing="md">
        <Loader size="xl" />
        <Text size="sm" color="dimmed">Veriler yükleniyor...</Text>
      </Stack>
    </Center>
  );

  if (error) return (
    <Alert icon={<IconInfoCircle size={16} />} title="Bir sorun oluştu" color="red" radius="md">
      {error}
    </Alert>
  );

  // ✅ Dinamik performans metrikleri hesapla
  const calculatePerformanceMetrics = () => {
    if (!summaryData) return null;

    const {
      totalDeposits = 0,
      totalRegistrations = 0,
      uniquePlayerCount = 0,
      totalEvents = 0
    } = summaryData;

    // Conversion Rate: Kayıt / Tekil Oyuncu
    const conversionRate = uniquePlayerCount > 0 
      ? ((totalRegistrations / uniquePlayerCount) * 100).toFixed(1)
      : 0;

    // Deposit Success Rate: Yatırım Yapan / Kayıt Olan
    const depositSuccessRate = totalRegistrations > 0
      ? ((totalDeposits / totalRegistrations) * 100).toFixed(1)
      : 0;

    // Active Sessions: Event Sayısı / Oyuncu Sayısı (engagement)
    const activeSessionsRatio = uniquePlayerCount > 0
      ? ((totalEvents / uniquePlayerCount)).toFixed(1)
      : 0;
    
    // 0-100 arası normalize et (max 20 event/user varsayımı)
    const activeSessionsPercent = Math.min((activeSessionsRatio / 20) * 100, 100).toFixed(0);

    // System Health: Genel sağlık skoru
    const systemHealth = (
      (parseFloat(conversionRate) * 0.3) +
      (parseFloat(depositSuccessRate) * 0.4) +
      (parseFloat(activeSessionsPercent) * 0.3)
    ).toFixed(0);

    return {
      conversionRate: parseFloat(conversionRate),
      depositSuccessRate: parseFloat(depositSuccessRate),
      activeSessionsPercent: parseFloat(activeSessionsPercent),
      activeSessionsRatio: parseFloat(activeSessionsRatio),
      systemHealth: parseFloat(systemHealth)
    };
  };

  const metrics = calculatePerformanceMetrics();

  // Health status text
  const getHealthStatus = (score) => {
    if (score >= 80) return { text: 'Mükemmel', color: 'teal' };
    if (score >= 60) return { text: 'İyi', color: 'blue' };
    if (score >= 40) return { text: 'Orta', color: 'yellow' };
    return { text: 'Düşük', color: 'red' };
  };

  const healthStatus = metrics ? getHealthStatus(metrics.systemHealth) : { text: 'Bilinmiyor', color: 'gray' };

  const stats = [
    {
      title: 'Toplam Olaylar',
      value: summaryData?.totalEvents || 0,
      icon: IconActivity,
      color: 'blue',
      description: 'Son 24 saat',
      trend: '+12%'
    },
    {
      title: 'Aktif Oyuncular',
      value: summaryData?.uniquePlayerCount || 0,
      icon: IconUsers,
      color: 'teal',
      description: 'Tekil kullanıcı',
      trend: '+8%'
    },
    {
      title: 'Yeni Kayıtlar',
      value: summaryData?.totalRegistrations || 0,
      icon: IconUserPlus,
      color: 'grape',
      description: 'Bugün kaydolan',
      trend: '+23%'
    },
    {
      title: 'Başarılı Yatırımlar',
      value: summaryData?.totalDeposits || 0,
      icon: IconCoin,
      color: 'yellow',
      description: 'Tamamlanan işlem',
      trend: '+15%'
    },
  ];

  return (
    <Stack spacing="xl">
      {/* Header */}
      <Group position="apart">
        <div>
          <Title order={1} size="h2" weight={700}>
            Dashboard
          </Title>
          <Text size="sm" color="dimmed" mt={4}>
            Platformunuzun performansını takip edin
          </Text>
        </div>
        <Badge size="lg" radius="md" variant="dot" color="green">
          Canlı Veri
        </Badge>
      </Group>

      {/* Quick Search */}
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group>
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconSearch size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text size="sm" weight={500}>Oyuncu Ara</Text>
            <Text size="xs" color="dimmed">Detaylı journey analizi için ID girin</Text>
          </div>
          <TextInput
            placeholder="Örn: USER_12345"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ width: 300 }}
            rightSection={
              <ActionIcon onClick={handleSearch} variant="filled" color="blue">
                <IconSearch size={16} />
              </ActionIcon>
            }
          />
        </Group>
      </Card>

      {/* Stats Grid */}
      <SimpleGrid cols={4} breakpoints={[
        { maxWidth: 'md', cols: 2 },
        { maxWidth: 'xs', cols: 1 }
      ]}>
        {stats.map((stat, index) => (
          <Paper key={index} shadow="sm" p="md" radius="md" withBorder>
            <Group position="apart">
              <ThemeIcon size="xl" radius="md" variant="light" color={stat.color}>
                <stat.icon size={24} />
              </ThemeIcon>
              <Badge 
                size="sm" 
                variant="light" 
                color={stat.trend.startsWith('+') ? 'teal' : 'red'}
                leftSection={
                  stat.trend.startsWith('+') ? 
                    <IconArrowUpRight size={12} /> : 
                    <IconArrowDownRight size={12} />
                }
              >
                {stat.trend}
              </Badge>
            </Group>
            
            <Text size="xs" color="dimmed" mt="md" mb={4}>
              {stat.title}
            </Text>
            <Text size="xl" weight={700}>
              {stat.value.toLocaleString('tr-TR')}
            </Text>
            <Text size="xs" color="dimmed" mt={2}>
              {stat.description}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Chart */}
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group position="apart" mb="md">
          <div>
            <Text size="lg" weight={600}>Aktivite Grafiği</Text>
            <Text size="sm" color="dimmed">Son 7 günlük event akışı</Text>
          </div>
          <Group spacing="xs">
            <Badge variant="dot" color="blue">Olaylar</Badge>
            <Badge variant="dot" color="teal">Oyuncular</Badge>
          </Group>
        </Group>
        <DashboardChart data={chartData} />
      </Card>

      {/* 2 Kolonlu Grid: Sol tarafta LiveEventFeed, sağ tarafta Recent Players ve Stats */}
      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="lg">
        {/* SOL: Canlı Event Akışı */}
        <LiveEventFeed maxHeight={600} />

        {/* SAĞ: Diğer kartlar */}
        <Stack spacing="lg">
          {/* Fraud Detection Stats */}
          <FraudStatsCard />

          {/* Recent Players */}
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group position="apart" mb="md">
              <div>
                <Text size="lg" weight={600}>Son Aktif Oyuncular</Text>
                <Text size="sm" color="dimmed">Son 24 saatte aktif olan kullanıcılar</Text>
              </div>
              <ThemeIcon size="md" radius="md" variant="light" color="teal">
                <IconUsers size={18} />
              </ThemeIcon>
            </Group>
            
            {summaryData?.uniquePlayers?.length > 0 ? (
              <Stack spacing="xs">
                {summaryData.uniquePlayers.slice(0, 8).map((playerId, index) => (
                  <Paper 
                    key={playerId} 
                    p="sm" 
                    radius="md" 
                    withBorder
                    component={RouterLink}
                    to={`/player/${playerId}`}
                    style={{ 
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    sx={(theme) => ({
                      '&:hover': {
                        backgroundColor: theme.colorScheme === 'dark' 
                          ? theme.colors.dark[6] 
                          : theme.colors.gray[0],
                        transform: 'translateX(4px)'
                      }
                    })}
                  >
                    <Group position="apart">
                      <Group spacing="sm">
                        <ThemeIcon size="sm" radius="xl" variant="light" color="teal">
                          {index + 1}
                        </ThemeIcon>
                        <Text size="sm" weight={500}>{playerId}</Text>
                      </Group>
                      <ActionIcon size="sm" color="blue" variant="subtle">
                        <IconArrowUpRight size={14} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Center py="xl">
                <Stack align="center" spacing="xs">
                  <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                    <IconUsers size={24} />
                  </ThemeIcon>
                  <Text size="sm" color="dimmed">Henüz aktif oyuncu yok</Text>
                </Stack>
              </Center>
            )}
          </Card>

          {/* ✅ DİNAMİK Performans Özeti */}
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group position="apart" mb="md">
              <div>
                <Text size="lg" weight={600}>Performans Özeti</Text>
                <Text size="sm" color="dimmed">Gerçek zamanlı metrikler</Text>
              </div>
              <ThemeIcon size="md" radius="md" variant="light" color="blue">
                <IconChartBar size={18} />
              </ThemeIcon>
            </Group>
            
            {metrics ? (
              <Stack spacing="md">
                <Box>
                  <Group position="apart" mb={8}>
                    <Text size="sm">Dönüşüm Oranı</Text>
                    <Tooltip label="Kayıt olan / Tekil oyuncu oranı">
                      <Text size="sm" weight={600}>{metrics.conversionRate}%</Text>
                    </Tooltip>
                  </Group>
                  <Progress 
                    value={metrics.conversionRate} 
                    size="lg" 
                    radius="xl" 
                    color="teal" 
                  />
                </Box>

                <Box>
                  <Group position="apart" mb={8}>
                    <Text size="sm">Etkileşim Skoru</Text>
                    <Tooltip label={`Ortalama ${metrics.activeSessionsRatio} event/oyuncu`}>
                      <Text size="sm" weight={600}>{metrics.activeSessionsPercent}%</Text>
                    </Tooltip>
                  </Group>
                  <Progress 
                    value={metrics.activeSessionsPercent} 
                    size="lg" 
                    radius="xl" 
                    color="blue" 
                  />
                </Box>

                <Box>
                  <Group position="apart" mb={8}>
                    <Text size="sm">Yatırım Başarı Oranı</Text>
                    <Tooltip label="Yatırım yapan / Kayıt olan oranı">
                      <Text size="sm" weight={600}>{metrics.depositSuccessRate}%</Text>
                    </Tooltip>
                  </Group>
                  <Progress 
                    value={metrics.depositSuccessRate} 
                    size="lg" 
                    radius="xl" 
                    color="yellow" 
                  />
                </Box>

                <Paper p="md" radius="md" withBorder bg="gray.0">
                  <Group position="apart">
                    <div>
                      <Text size="xs" color="dimmed" mb={4}>System Health</Text>
                      <Text size="lg" weight={700} color={healthStatus.color}>
                        {healthStatus.text}
                      </Text>
                    </div>
                    <RingProgress
                      size={60}
                      thickness={6}
                      sections={[{ value: metrics.systemHealth, color: healthStatus.color }]}
                      label={
                        <Center>
                          <Text size="xs" weight={700}>{metrics.systemHealth}%</Text>
                        </Center>
                      }
                    />
                  </Group>
                </Paper>
              </Stack>
            ) : (
              <Center py="xl">
                <Text size="sm" color="dimmed">Veri hesaplanıyor...</Text>
              </Center>
            )}
          </Card>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}

export default Dashboard;