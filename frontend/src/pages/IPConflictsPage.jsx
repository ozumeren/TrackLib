import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  Title, Card, Table, Badge, Text, Group, Loader, Alert,
  Select, Stack, ThemeIcon, ActionIcon, Tooltip, Center
} from '@mantine/core';
import {
  IconAlertTriangle, IconShieldCheck, IconEye, 
  IconNetwork, IconUsers
} from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';

function IPConflictsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('7');

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/analytics/ip-conflicts?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching IP conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, days]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'orange';
      case 'LOW': return 'yellow';
      default: return 'gray';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'HIGH': return <IconAlertTriangle size={16} />;
      case 'MEDIUM': return <IconShieldCheck size={16} />;
      default: return <IconNetwork size={16} />;
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Stack spacing="md">
      <Group position="apart">
        <Title order={2}>🌐 IP Conflict Detection</Title>
        <Select
          value={days}
          onChange={setDays}
          data={[
            { value: '7', label: 'Son 7 Gün' },
            { value: '14', label: 'Son 14 Gün' },
            { value: '30', label: 'Son 30 Gün' },
          ]}
          style={{ width: 150 }}
        />
      </Group>

      {/* Stats Cards */}
      <Group grow>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>
                Toplam Conflict
              </Text>
              <Text size="xl" weight={700}>
                {data?.totalConflicts || 0}
              </Text>
            </div>
            <ThemeIcon size="xl" radius="md" variant="light" color="orange">
              <IconAlertTriangle size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart">
            <div>
              <Text size="xs" color="dimmed" weight={500}>
                High Risk
              </Text>
              <Text size="xl" weight={700} color="red">
                {data?.conflicts.filter(c => c.riskLevel === 'HIGH').length || 0}
              </Text>
            </div>
            <ThemeIcon size="xl" radius="md" variant="light" color="red">
              <IconShieldCheck size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </Group>

      {/* Conflicts Table */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="md">Şüpheli IP Adresleri</Title>
        
        {data?.conflicts.length > 0 ? (
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>IP Adresi</th>
                <th>Risk Seviyesi</th>
                <th>Hesap Sayısı</th>
                <th>Oyuncular</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.conflicts.map((conflict, index) => (
                <tr key={index}>
                  <td>
                    <Text weight={500} family="monospace">
                      {conflict.ipAddress}
                    </Text>
                  </td>
                  <td>
                    <Badge
                      color={getRiskColor(conflict.riskLevel)}
                      leftSection={getRiskIcon(conflict.riskLevel)}
                    >
                      {conflict.riskLevel}
                    </Badge>
                  </td>
                  <td>
                    <Group spacing="xs">
                      <IconUsers size={16} />
                      <Text weight={600}>{conflict.playerCount}</Text>
                    </Group>
                  </td>
                  <td>
                    <Stack spacing={4}>
                      {conflict.players.slice(0, 3).map((p, i) => (
                        <Text key={i} size="xs" family="monospace">
                          {p.playerId}
                        </Text>
                      ))}
                      {conflict.players.length > 3 && (
                        <Text size="xs" color="dimmed">
                          +{conflict.players.length - 3} daha...
                        </Text>
                      )}
                    </Stack>
                  </td>
                  <td>
                    <Tooltip label="Detayları Gör">
                      <ActionIcon
                        component={RouterLink}
                        to={`/ip-details/${conflict.ipAddress}`}
                        variant="light"
                        color="blue"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Alert icon={<IconShieldCheck size={16} />} color="green">
            Son {days} günde IP conflict tespit edilmedi. Harika! ✅
          </Alert>
        )}
      </Card>
    </Stack>
  );
}

export default IPConflictsPage;