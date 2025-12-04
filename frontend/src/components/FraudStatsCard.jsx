import { Card, Title, Text, Group, Badge, Stack, RingProgress, Center, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconShieldCheck, IconAlertTriangle, IconShieldX, IconTrendingUp } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function FraudStatsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFraudStats();
  }, []);

  const fetchFraudStats = async () => {
    try {
      const response = await axios.get('/api/fraud/stats?days=30');
      setStats(response.data);
    } catch (error) {
      console.error('Fraud stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>Yükleniyor...</Text>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const criticalAlerts = stats.alertsBySeverity?.CRITICAL || 0;
  const highAlerts = stats.alertsBySeverity?.HIGH || 0;
  const totalAlerts = stats.totalAlerts || 0;
  const pendingAlerts = stats.pendingAlerts || 0;

  // Calculate risk percentage (critical + high alerts / total)
  const riskPercentage = totalAlerts > 0
    ? Math.round(((criticalAlerts + highAlerts) / totalAlerts) * 100)
    : 0;

  // Determine risk level color
  const getRiskColor = () => {
    if (criticalAlerts > 0) return 'red';
    if (highAlerts > 5) return 'orange';
    if (highAlerts > 0) return 'yellow';
    return 'green';
  };

  const riskColor = getRiskColor();

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => navigate('/fraud/alerts')}
    >
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4}>Fraud Detection</Title>
          <Text size="sm" c="dimmed">Son 30 gün</Text>
        </div>
        <ThemeIcon size="xl" radius="md" variant="light" color={riskColor}>
          {criticalAlerts > 0 ? (
            <IconShieldX size={28} />
          ) : (
            <IconShieldCheck size={28} />
          )}
        </ThemeIcon>
      </Group>

      <SimpleGrid cols={2} spacing="lg">
        {/* Left side - Ring Progress */}
        <Center>
          <RingProgress
            size={120}
            thickness={12}
            sections={[
              { value: riskPercentage, color: riskColor }
            ]}
            label={
              <Center>
                <Stack gap={0} align="center">
                  <Text size="xl" fw={700}>
                    {totalAlerts}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Uyarı
                  </Text>
                </Stack>
              </Center>
            }
          />
        </Center>

        {/* Right side - Stats */}
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm">Bekleyen</Text>
            <Badge color="yellow" variant="light">
              {pendingAlerts}
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="sm">Kritik</Text>
            <Badge color="red" variant="light">
              {criticalAlerts}
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="sm">Yüksek Risk</Text>
            <Badge color="orange" variant="light">
              {highAlerts}
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text size="sm">High Risk Oyuncular</Text>
            <Badge color="grape" variant="light">
              {stats.highRiskPlayersCount || 0}
            </Badge>
          </Group>
        </Stack>
      </SimpleGrid>

      {/* Alert Types */}
      {totalAlerts > 0 && (
        <Stack gap="xs" mt="md">
          <Text size="xs" c="dimmed" fw={500}>Uyarı Tipleri:</Text>
          <Group gap="xs">
            {stats.alertsByType?.MULTI_ACCOUNT > 0 && (
              <Badge size="sm" variant="dot" color="red">
                Multi-Account ({stats.alertsByType.MULTI_ACCOUNT})
              </Badge>
            )}
            {stats.alertsByType?.RAPID_DEPOSIT_WITHDRAWAL > 0 && (
              <Badge size="sm" variant="dot" color="orange">
                Rapid Withdrawal ({stats.alertsByType.RAPID_DEPOSIT_WITHDRAWAL})
              </Badge>
            )}
          </Group>
        </Stack>
      )}

      {criticalAlerts === 0 && highAlerts === 0 && totalAlerts === 0 && (
        <Group gap="xs" mt="md">
          <ThemeIcon size="sm" color="green" variant="light">
            <IconShieldCheck size={16} />
          </ThemeIcon>
          <Text size="sm" c="green">
            Şüpheli aktivite tespit edilmedi
          </Text>
        </Group>
      )}
    </Card>
  );
}
