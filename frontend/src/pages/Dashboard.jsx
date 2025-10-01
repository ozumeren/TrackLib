import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { Stack, Title, Card, SimpleGrid, Group, Loader, Alert, Text, Box, Anchor, TextInput, Button } from '@mantine/core';
import { useAuth } from '../AuthContext';
import DashboardChart from '../components/DashboardChart'; // YENİ: Grafik bileşenini import et
import { IconSearch } from '@tabler/icons-react';

function Dashboard() {
  const { token } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [chartData, setChartData] = useState([]); // YENİ: Grafik verisi için state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        // İki API isteğini aynı anda yap
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

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert color="red">{error}</Alert>;

  return (
    <Stack spacing="lg">
      <Title order={2}>TrackLib Dashboard</Title>
      
      {/* YENİ: Grafik Kartı */}
      <DashboardChart data={chartData} />

      <Card shadow="sm" p="lg" radius="md" withBorder>
          <Title order={4}>Oyuncu Ara</Title>
          <Text size="sm" color="dimmed" mt={5}>
            Detaylı hareketlerini görmek için bir oyuncu ID'si arayın.
          </Text>
          <Group mt="md">
            <TextInput
              placeholder="Örn: USR-123"
              value={searchId}
              onChange={(event) => setSearchId(event.currentTarget.value)}
              onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
              }}
              style={{ flex: 1 }}
            />
            <Button onClick={handleSearch} leftSection={<IconSearch size={16} />}>
              Ara
            </Button>
          </Group>
      </Card>

      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Title order={4}>Son 24 Saat Özeti</Title>
        {summaryData ? (
          <SimpleGrid cols={4} mt="md">
            <Box><Text size="xs" color="dimmed">Toplam Olaylar</Text><Text size="xl" weight={700}>{summaryData.totalEvents}</Text></Box>
            <Box><Text size="xs" color="dimmed">Tekil Oyuncular</Text><Text size="xl" weight={700}>{summaryData.uniquePlayerCount}</Text></Box>
            <Box><Text size="xs" color="dimmed">Yeni Kayıtlar</Text><Text size="xl" weight={700}>{summaryData.totalRegistrations}</Text></Box>
            <Box><Text size="xs" color="dimmed">Başarılı Yatırımlar</Text><Text size="xl" weight={700}>{summaryData.totalDeposits}</Text></Box>
          </SimpleGrid>
        ) : (<Text>Veri bulunamadı.</Text>)}
      </Card>
      
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Title order={4}>Son Aktif Oyuncular</Title>
        {summaryData?.uniquePlayers?.length > 0 ? (
          <Stack spacing="xs" mt="md">
            {summaryData.uniquePlayers.map(playerId => (
              <Anchor component={RouterLink} to={`/journey/${playerId}`} key={playerId}>
                {playerId}
              </Anchor>
            ))}
          </Stack>
        ) : (<Text mt="md">Son 24 saatte aktif oyuncu bulunamadı.</Text>)}
      </Card>
    </Stack>
  );
}

export default Dashboard;

