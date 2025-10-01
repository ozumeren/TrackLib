import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { Stack, Title, Table, Loader, Alert, Group, Text, Card, Badge, Button, Anchor, Tooltip } from '@mantine/core';
import { useAuth } from '../AuthContext';
import { translateEventName } from '../utils/eventTranslator';
import { IconArrowLeft } from '@tabler/icons-react';

// Olay türlerine göre renkler atayalım
const eventColors = {
  login_successful: 'green',
  deposit_successful: 'teal',
  registration_completed: 'blue',
  deposit_failed: 'red',
  page_view: 'gray',
};

function PlayerJourney() {
  const { playerId } = useParams();
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJourneyData = async () => {
      if (!token || !playerId) return;
      try {
        setLoading(true);
        const response = await axios.get(`/api/analytics/journey/${playerId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setEvents(response.data);
      } catch (err) {
        setError('Oyuncu verileri çekilirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchJourneyData();
  }, [token, playerId]);

  if (loading) return <Group position="center" mt="xl"><Loader /></Group>;
  if (error) return <Alert color="red">{error}</Alert>;

  const rows = events.map(event => {
    // URL'yi daha okunabilir hale getirmek için sadece yolu (pathname) alalım
    let displayUrl = event.url;
    try {
      const urlObject = new URL(event.url);
      displayUrl = urlObject.pathname + urlObject.search;
    } catch (e) {
      // Geçersiz URL formatı durumunda orijinalini göster
    }

    return (
      <tr key={event.id}>
        <td>
          <Badge color={eventColors[event.eventName] || 'gray'} variant="light">
            {translateEventName(event.eventName)}
          </Badge>
        </td>
        <td>
          <Tooltip label={event.url}>
            <Anchor href={event.url} target="_blank" size="sm">
              {displayUrl}
            </Anchor>
          </Tooltip>
        </td>
        <td>
          <Tooltip label={new Date(event.createdAt).toISOString()}>
            <Text size="sm">{new Date(event.createdAt).toLocaleString()}</Text>
          </Tooltip>
        </td>
      </tr>
    );
  });

  return (
    <Stack spacing="lg">
       <Group>
        <Button component={RouterLink} to="/" variant="light" leftSection={<IconArrowLeft size={16} />}>
          Dashboard'a Geri Dön
        </Button>
      </Group>
      <Card shadow="sm" p="lg" radius="md">
        <Title order={2} mb="lg">Oyuncu Yolculuğu: {playerId}</Title>
        {events.length > 0 ? (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Olay</th>
                <th>URL</th>
                <th>Zaman</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        ) : (
          <Text>Bu oyuncuya ait olay bulunamadı.</Text>
        )}
      </Card>
    </Stack>
  );
}

export default PlayerJourney;

