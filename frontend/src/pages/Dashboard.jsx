import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // useNavigate'i import et
import axios from 'axios';
import { Box, Stack, Title, Text, Card, SimpleGrid, Group, Loader, Alert, Anchor, TextInput, Button } from '@mantine/core';
import { useAuth } from '../AuthContext';
import { IconSearch } from '@tabler/icons-react'; // Arama ikonunu import et

function Dashboard() {
  const { token } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- YENİ EKLENEN KISIM ---
  const [searchId, setSearchId] = useState('');
  const navigate = useNavigate();
  // --- YENİ KISIM SONU ---

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/analytics/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSummaryData(response.data.last_24_hours);
      } catch (err) { 
        setError('Veri çekilirken bir hata oluştu.');
      } finally { 
        setLoading(false);
      }
    };
    fetchSummaryData();
  }, [token]);

  // --- YENİ FONKSİYON ---
  const handleSearch = () => {
    if (searchId.trim()) {
      navigate(`/journey/${searchId.trim()}`);
    }
  };
  // --- YENİ FONKSİYON SONU ---

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert color="red">{error}</Alert>;

  return (
    <Stack spacing="lg">
      <Title order={2}>iGaming Tracker Dashboard</Title>
      
      {/* --- YENİ KART: OYUNCU ARAMA --- */}
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
      {/* --- YENİ KART SONU --- */}

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

