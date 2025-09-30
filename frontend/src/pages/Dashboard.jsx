import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { Stack, Title, Text, Card, SimpleGrid, Group, Loader, Alert, Anchor, Box } from '@mantine/core';
import { useAuth } from '../AuthContext'; // 1. Adım: AuthContext'i import et

function Dashboard() {
  const { token } = useAuth(); // 2. Adım: Giriş yapmış kullanıcının jetonunu al
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryData = async () => {
      // 3. Adım: Jeton yoksa istek göndermeyi deneme
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // 4. Adım: Sabit API anahtarı yerine dinamik jetonu kullan
        const response = await axios.get('/api/analytics/summary', {
          headers: {
            'Authorization': `Bearer ${token}` // Jetonu Authorization başlığına ekle
          }
        });
        setSummaryData(response.data.last_24_hours);
        setError(null);
      } catch (err) { 
        setError('Veri çekilirken bir hata oluştu.');
        console.error(err);
      } finally { 
        setLoading(false);
      }
    };
    fetchSummaryData();
  }, [token]); // 5. Adım: Jeton değiştiğinde (örn: giriş yapıldığında) veriyi yeniden çek

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert color="red" title="Hata">{error}</Alert>;

  return (
    <Stack spacing="lg">
      <Title order={2}>iGaming Tracker Dashboard</Title>
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

