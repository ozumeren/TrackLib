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
import { 
  IconSearch, IconUsers, IconCoin, IconTrendingUp, 
  IconUserPlus, IconArrowUpRight, IconArrowDownRight,
  IconActivity, IconChartBar, IconInfoCircle
} from '@tabler/icons-react';

function Dashboard() {
  const { token } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [summaryRes, chartRes] = await Promise.all([
          axios.get('/api/analytics/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
          axios.get('/api/analytics/timeseries?days=7', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        setSummaryData(summaryRes.data.last_24_hours);
        setChartData(chartRes.data);
      } catch (err) { 
        setError('Veri çekilirken bir hata oluştu.');
      } finally { 
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

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

  // Stat kartları için data
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
            <Badge variant="dot" color="blue">Events</Badge>
            <Badge variant="dot" color="teal">Players</Badge>
          </Group>
        </Group>
        <DashboardChart data={chartData} />
      </Card>

      {/* Recent Players */}
      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
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
                  to={`/journey/${playerId}`}
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

        {/* Quick Stats */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group position="apart" mb="md">
            <div>
              <Text size="lg" weight={600}>Performans Özeti</Text>
              <Text size="sm" color="dimmed">Genel sistem durumu</Text>
            </div>
            <ThemeIcon size="md" radius="md" variant="light" color="blue">
              <IconChartBar size={18} />
            </ThemeIcon>
          </Group>
          
          <Stack spacing="md">
            <Box>
              <Group position="apart" mb={8}>
                <Text size="sm">Conversion Rate</Text>
                <Text size="sm" weight={600}>12.5%</Text>
              </Group>
              <Progress value={12.5} size="lg" radius="xl" color="teal" />
            </Box>

            <Box>
              <Group position="apart" mb={8}>
                <Text size="sm">Active Sessions</Text>
                <Text size="sm" weight={600}>87%</Text>
              </Group>
              <Progress value={87} size="lg" radius="xl" color="blue" />
            </Box>

            <Box>
              <Group position="apart" mb={8}>
                <Text size="sm">Deposit Success Rate</Text>
                <Text size="sm" weight={600}>94%</Text>
              </Group>
              <Progress value={94} size="lg" radius="xl" color="yellow" />
            </Box>

            <Paper p="md" radius="md" withBorder bg="gray.0">
              <Group position="apart">
                <div>
                  <Text size="xs" color="dimmed" mb={4}>System Health</Text>
                  <Text size="lg" weight={700} color="teal">Excellent</Text>
                </div>
                <RingProgress
                  size={60}
                  thickness={6}
                  sections={[{ value: 98, color: 'teal' }]}
                  label={
                    <Center>
                      <Text size="xs" weight={700}>98%</Text>
                    </Center>
                  }
                />
              </Group>
            </Paper>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

export default Dashboard;