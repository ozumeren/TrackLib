import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Stack, Title, Card, Group, Loader, Alert, Text, Badge,
  Table, ActionIcon, Select, TextInput, Pagination, Modal,
  Button, Textarea, Center, Paper, ThemeIcon
} from '@mantine/core';
import {
  IconAlertTriangle, IconShieldCheck, IconEye, IconFilter,
  IconSearch, IconShieldX, IconInfoCircle
} from '@tabler/icons-react';
import { useAuth } from '../AuthContext';

export default function FraudAlerts() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('');

  // Modal for alert review
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [page, statusFilter, severityFilter, alertTypeFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset: (page - 1) * limit
      };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (alertTypeFilter) params.alertType = alertTypeFilter;

      const response = await axios.get('/api/fraud/alerts', { params });
      setAlerts(response.data.alerts);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      console.error('Fraud alerts fetch error:', err);
      setError('Fraud uyarıları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAlert = (alert) => {
    setSelectedAlert(alert);
    setReviewStatus(alert.status);
    setReviewAction(alert.action || '');
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedAlert) return;

    try {
      setSubmitting(true);
      await axios.put(`/api/fraud/alerts/${selectedAlert.id}/review`, {
        status: reviewStatus,
        action: reviewAction || undefined
      });
      setReviewModalOpen(false);
      fetchAlerts();
    } catch (err) {
      console.error('Review submit error:', err);
      alert('İnceleme kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'yellow';
      case 'REVIEWED': return 'blue';
      case 'CONFIRMED': return 'red';
      case 'FALSE_POSITIVE': return 'green';
      default: return 'gray';
    }
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      'MULTI_ACCOUNT': 'Multi-Account',
      'RAPID_DEPOSIT_WITHDRAWAL': 'Hızlı Çekim',
      'BONUS_ABUSE': 'Bonus Abuse',
      'SUSPICIOUS_PATTERN': 'Şüpheli Aktivite',
      'HIGH_RISK_IP': 'Yüksek Riskli IP'
    };
    return labels[type] || type;
  };

  if (loading && alerts.length === 0) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Fraud uyarıları yükleniyor...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack spacing="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Fraud Detection Uyarıları</Title>
          <Text size="sm" c="dimmed">Şüpheli aktivite uyarılarını inceleyin</Text>
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
            placeholder="Durum"
            icon={<IconFilter size={16} />}
            data={[
              { value: '', label: 'Tümü' },
              { value: 'PENDING', label: 'Bekleyen' },
              { value: 'REVIEWED', label: 'İncelendi' },
              { value: 'CONFIRMED', label: 'Onaylandı' },
              { value: 'FALSE_POSITIVE', label: 'Yanlış Alarm' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 200 }}
          />

          <Select
            placeholder="Önem Derecesi"
            icon={<IconFilter size={16} />}
            data={[
              { value: '', label: 'Tümü' },
              { value: 'CRITICAL', label: 'Kritik' },
              { value: 'HIGH', label: 'Yüksek' },
              { value: 'MEDIUM', label: 'Orta' },
              { value: 'LOW', label: 'Düşük' }
            ]}
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: 200 }}
          />

          <Select
            placeholder="Uyarı Tipi"
            icon={<IconFilter size={16} />}
            data={[
              { value: '', label: 'Tümü' },
              { value: 'MULTI_ACCOUNT', label: 'Multi-Account' },
              { value: 'RAPID_DEPOSIT_WITHDRAWAL', label: 'Hızlı Çekim' },
              { value: 'BONUS_ABUSE', label: 'Bonus Abuse' },
              { value: 'SUSPICIOUS_PATTERN', label: 'Şüpheli Aktivite' }
            ]}
            value={alertTypeFilter}
            onChange={setAlertTypeFilter}
            style={{ width: 200 }}
          />
        </Group>
      </Card>

      {/* Alerts Table */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        {alerts.length === 0 ? (
          <Center py="xl">
            <Stack align="center" spacing="md">
              <ThemeIcon size={60} radius="xl" variant="light" color="green">
                <IconShieldCheck size={30} />
              </ThemeIcon>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" weight={600}>Uyarı Bulunamadı</Text>
                <Text size="sm" c="dimmed">Seçili filtrelerle eşleşen fraud uyarısı yok</Text>
              </div>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Oyuncu</th>
                  <th>Tip</th>
                  <th>Önem</th>
                  <th>Risk Skoru</th>
                  <th>Durum</th>
                  <th>Sebep</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Text size="sm">
                        {new Date(alert.createdAt).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(alert.createdAt).toLocaleTimeString('tr-TR')}
                      </Text>
                    </td>
                    <td>
                      <Text
                        size="sm"
                        style={{ cursor: 'pointer' }}
                        c="blue"
                        onClick={() => navigate(`/player/${alert.player.playerId}`)}
                      >
                        {alert.player.playerId}
                      </Text>
                      {alert.player.email && (
                        <Text size="xs" c="dimmed">{alert.player.email}</Text>
                      )}
                    </td>
                    <td>
                      <Badge size="sm" variant="dot">
                        {getAlertTypeLabel(alert.alertType)}
                      </Badge>
                    </td>
                    <td>
                      <Badge size="sm" color={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </td>
                    <td>
                      <Badge size="sm" variant="light" color={alert.riskScore >= 70 ? 'red' : alert.riskScore >= 50 ? 'orange' : 'yellow'}>
                        {alert.riskScore}
                      </Badge>
                    </td>
                    <td>
                      <Badge size="sm" color={getStatusColor(alert.status)}>
                        {alert.status}
                      </Badge>
                    </td>
                    <td>
                      <Text size="sm" lineClamp={2}>
                        {alert.reason}
                      </Text>
                    </td>
                    <td>
                      <ActionIcon
                        color="blue"
                        variant="light"
                        onClick={() => handleReviewAlert(alert)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
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

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Fraud Uyarısını İncele"
        size="lg"
      >
        {selectedAlert && (
          <Stack spacing="md">
            <Group>
              <Badge size="lg" color={getSeverityColor(selectedAlert.severity)}>
                {selectedAlert.severity}
              </Badge>
              <Badge size="lg" variant="dot">
                {getAlertTypeLabel(selectedAlert.alertType)}
              </Badge>
              <Badge size="lg" variant="light">
                Risk: {selectedAlert.riskScore}
              </Badge>
            </Group>

            <div>
              <Text size="sm" weight={600} mb={4}>Oyuncu:</Text>
              <Text size="sm">{selectedAlert.player.playerId}</Text>
              {selectedAlert.player.email && (
                <Text size="xs" c="dimmed">{selectedAlert.player.email}</Text>
              )}
            </div>

            <div>
              <Text size="sm" weight={600} mb={4}>Sebep:</Text>
              <Text size="sm">{selectedAlert.reason}</Text>
            </div>

            <div>
              <Text size="sm" weight={600} mb={4}>Kanıtlar:</Text>
              <Paper p="sm" withBorder radius="md">
                <pre style={{ fontSize: '12px', margin: 0 }}>
                  {JSON.stringify(selectedAlert.evidence, null, 2)}
                </pre>
              </Paper>
            </div>

            <Select
              label="Durum"
              data={[
                { value: 'PENDING', label: 'Bekleyen' },
                { value: 'REVIEWED', label: 'İncelendi' },
                { value: 'CONFIRMED', label: 'Onaylandı' },
                { value: 'FALSE_POSITIVE', label: 'Yanlış Alarm' }
              ]}
              value={reviewStatus}
              onChange={setReviewStatus}
            />

            <Select
              label="Aksiyon"
              data={[
                { value: '', label: 'Aksiyon Yok' },
                { value: 'FLAGGED', label: 'Bayraklandı' },
                { value: 'LIMITED', label: 'Sınırlandırıldı' },
                { value: 'BLOCKED', label: 'Engellendi' },
                { value: 'VERIFICATION_REQUIRED', label: 'Doğrulama Gerekli' }
              ]}
              value={reviewAction}
              onChange={setReviewAction}
            />

            <Group position="right">
              <Button variant="default" onClick={() => setReviewModalOpen(false)}>
                İptal
              </Button>
              <Button onClick={submitReview} loading={submitting}>
                Kaydet
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
