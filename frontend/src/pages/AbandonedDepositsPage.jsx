import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Title, Card, Loader, Alert, Group, Text, Table, Anchor } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';

function AbandonedDepositsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAbandonedDeposits = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/analytics/abandoned-deposits', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setData(response.data);
      } catch (err) {
        setError('Veri çekilirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchAbandonedDeposits();
  }, [token]);

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">{error}</Alert>;

  const rows = data?.players.map((player) => (
    <tr key={player.playerId}>
      <td>
        <Anchor component={RouterLink} to={`/journey/${player.playerId}`}>
            {player.playerId}
        </Anchor>
      </td>
      <td>{player.lastAttemptedAmount ? `${player.lastAttemptedAmount.toFixed(2)} TRY` : 'Bilinmiyor'}</td>
      <td>{player.lastAttemptDate ? new Date(player.lastAttemptDate).toLocaleString() : '-'}</td>
    </tr>
  ));

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Title order={2} mb="lg">Terk Edilmiş Yatırımlar (Son {data?.periodInDays} Gün)</Title>
      <Text mb="md">Para yatırma sayfasını ziyaret edip işlemi tamamlamayan oyuncular.</Text>
      
      {data?.players.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>Oyuncu ID</th>
              <th>Son Denediği Miktar</th>
              <th>Son Deneme Tarihi</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      ) : (
        <Text>Belirtilen periyotta terk edilmiş yatırım bulunamadı.</Text>
      )}
    </Card>
  );
}

export default AbandonedDepositsPage;
