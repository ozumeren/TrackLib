import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Stack, Title, Card, Group, Loader, Alert, Text, Badge,
  Table, Select, Pagination, Center, Paper, ThemeIcon,
  RingProgress, Progress
} from '@mantine/core';
import {
  IconShieldCheck, IconShieldX, IconFilter, IconInfoCircle,
  IconAlertTriangle
} from '@tabler/icons-react';
import { useAuth } from '../AuthContext';

export default function RiskProfiles() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [riskLevelFilter, setRiskLevelFilter] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, [page, riskLevelFilter]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset: (page - 1) * limit
      };
      if (riskLevelFilter) params.riskLevel = riskLevelFilter;

      const response = await axios.get('/api/fraud/risk-profiles', { params });
      setProfiles(response.data.profiles);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      console.error('Risk profiles fetch error:', err);
      setError('Risk profilleri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'green';
      default: return 'gray';
    }
  };

  const getRiskLevelLabel = (level) => {
    const labels = {
      'CRITICAL': 'Kritik',
      'HIGH': 'Yüksek',
      'MEDIUM': 'Orta',
      'LOW': 'Düşük'
    };
    return labels[level] || level;
  };

  if (loading && profiles.length === 0) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Risk profilleri yükleniyor...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack spacing="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Oyuncu Risk Profilleri</Title>
          <Text size="sm" c="dimmed">Oyuncuların risk seviyelerini görüntüleyin</Text>
        </div>
      </Group>

      {error && (
        <Alert icon={<IconInfoCircle size={16} />} title="Hata" color="red" radius="md">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group>
          <Select
            placeholder="Risk Seviyesi"
            icon={<IconFilter size={16} />}
            data={[
              { value: '', label: 'Tümü' },
              { value: 'CRITICAL', label: 'Kritik' },
              { value: 'HIGH', label: 'Yüksek' },
              { value: 'MEDIUM', label: 'Orta' },
              { value: 'LOW', label: 'Düşük' }
            ]}
            value={riskLevelFilter}
            onChange={setRiskLevelFilter}
            style={{ width: 200 }}
          />

          <Badge variant="light">
            Toplam: {total} oyuncu
          </Badge>
        </Group>
      </Card>

      {/* Profiles Table */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {profiles.length === 0 ? (
          <Center py="xl">
            <Stack align="center" spacing="md">
              <ThemeIcon size={60} radius="xl" variant="light" color="green">
                <IconShieldCheck size={30} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600}>Profil Bulunamadı</Text>
                <Text size="sm" c="dimmed">Seçili filtrelerle eşleşen risk profili yok</Text>
              </div>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Oyuncu</th>
                  <th>Risk Seviyesi</th>
                  <th>Risk Skoru</th>
                  <th>Bayraklar</th>
                  <th>IP Adresleri</th>
                  <th>Finansal</th>
                  <th>Son Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr
                    key={profile.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/player/${profile.player.playerId}`)}
                  >
                    <td>
                      <Text size="sm" weight={600} c="blue">
                        {profile.player.playerId}
                      </Text>
                      {profile.player.email && (
                        <Text size="xs" c="dimmed">{profile.player.email}</Text>
                      )}
                    </td>
                    <td>
                      <Badge color={getRiskLevelColor(profile.riskLevel)}>
                        {getRiskLevelLabel(profile.riskLevel)}
                      </Badge>
                    </td>
                    <td>
                      <Group spacing="xs">
                        <Progress
                          value={profile.riskScore}
                          color={getRiskLevelColor(profile.riskLevel)}
                          size="lg"
                          style={{ width: 100 }}
                        />
                        <Text size="sm" weight={600}>
                          {profile.riskScore}
                        </Text>
                      </Group>
                    </td>
                    <td>
                      <Stack spacing={4}>
                        {profile.hasMultipleAccounts && (
                          <Badge size="xs" color="red" variant="dot">
                            Multi-Account
                          </Badge>
                        )}
                        {profile.isVpnUser && (
                          <Badge size="xs" color="orange" variant="dot">
                            VPN
                          </Badge>
                        )}
                        {profile.rapidWithdrawal && (
                          <Badge size="xs" color="yellow" variant="dot">
                            Hızlı Çekim
                          </Badge>
                        )}
                        {profile.suspiciousPattern && (
                          <Badge size="xs" color="purple" variant="dot">
                            Şüpheli
                          </Badge>
                        )}
                        {!profile.hasMultipleAccounts && !profile.isVpnUser && !profile.rapidWithdrawal && !profile.suspiciousPattern && (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                      </Stack>
                    </td>
                    <td>
                      <Text size="xs" c="dimmed">
                        {profile.ipAddresses.length} IP
                      </Text>
                      {profile.ipAddresses.length > 0 && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {profile.ipAddresses[0]}
                        </Text>
                      )}
                    </td>
                    <td>
                      <Stack spacing={2}>
                        <Text size="xs">
                          Yatırım: {profile.totalDeposits}
                        </Text>
                        <Text size="xs">
                          Çekim: {profile.totalWithdrawals}
                        </Text>
                        <Text size="xs" c={profile.netProfit >= 0 ? 'red' : 'green'}>
                          Net: {profile.netProfit.toFixed(2)}
                        </Text>
                      </Stack>
                    </td>
                    <td>
                      <Text size="xs">
                        {new Date(profile.lastRiskCheck).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(profile.lastRiskCheck).toLocaleTimeString('tr-TR')}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Pagination */}
            <Group position="center" mt="xl">
              <Pagination
                page={page}
                onChange={setPage}
                total={Math.ceil(total / limit)}
              />
            </Group>
          </>
        )}
      </Card>
    </Stack>
  );
}
