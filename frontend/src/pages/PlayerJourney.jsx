import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Stack, Title, Table, Loader, Alert, Group, Text } from '@mantine/core';
import { useAuth } from '../AuthContext';
import { translateEventName } from '../utils/eventTranslator'; // 1. YENİ: Çevirmen fonksiyonunu import et

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

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert color="red">{error}</Alert>;

  return (
    <Stack spacing="lg">
      <Title order={2}>Oyuncu Yolculuğu: {playerId}</Title>
      {events.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>Olay</th>
              <th>URL</th>
              <th>Zaman</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                {/* 2. YENİ: Olay adını çevirerek göster */}
                <td>{translateEventName(event.eventName)}</td>
                <td>{event.url}</td>
                <td>{new Date(event.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Text>Bu oyuncuya ait olay bulunamadı.</Text>
      )}
    </Stack>
  );
}

export default PlayerJourney;

