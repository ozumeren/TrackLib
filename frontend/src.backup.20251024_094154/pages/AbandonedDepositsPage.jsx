// frontend/src/pages/AbandonedDepositsPage.jsx - İyileştirilmiş Versiyon
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import {
  Title, Card, Loader, Alert, Group, Text, Table, Anchor,
  SimpleGrid, Badge, Stack, ThemeIcon, Center, Button,
  ActionIcon, Tooltip, Paper, Box, Menu, Modal, TextInput
} from '@mantine/core';
import {
  IconAlertCircle, IconCoin, IconClock, IconUsers,
  IconTrendingDown, IconSend, IconDotsVertical,
  IconEye, IconMail, IconBrandTelegram, IconRefresh
} from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import { notifications } from '@mantine/notifications';

function AbandonedDepositsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const fetchAbandonedDeposits = async () => {
    if (!token) return;
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchAbandonedDeposits();
  }, [token]);

  const handleContactPlayer = (player) => {
    setSelectedPlayer(player);
    setContactModalOpen(true);
  };

  const handleSendMessage = (method) => {
    // TODO: İmplementasyon eklenecek
    notifications.show({
      title: 'Mesaj Gönderildi',
      message: `${selectedPlayer.playerId} oyuncusuna ${method} ile mesaj gönderildi.`,
      color: 'teal',
    });
    setContactModalOpen(false);
    setSelectedPlayer(null);
  };

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Veriler yükleniyor...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red" radius="md">
        {error}
      </Alert>
    );
  }

  const totalAttemptedAmount = data?.players.reduce(
    (sum, p) => sum + (p.lastAttemptedAmount || 0), 0
  ) || 0;

  const avgAttemptedAmount = data?.players.length > 0
    ? totalAttemptedAmount / data.players.length
    : 0;

  return (
    <>
      {/* Contact Modal */}
      <Modal
        opened={contactModalOpen}
        onClose={() => { setContactModalOpen(false); setSelectedPlayer(null); }}
        title="Oyuncuya Ulaş"
        centered
        size="md"
      >
        <Stack>
          <Text>
            <strong>{selectedPlayer?.playerId}</strong> oyuncusuna nasıl ulaşmak istersiniz?
          </Text>
          <Text size="sm" color="dimmed">
            Son denenen miktar: <strong>₺{selectedPlayer?.lastAttemptedAmount?.toFixed(2)}</strong>
          </Text>

          <Stack spacing="xs" mt="md">
            <Button
              leftSection={<IconBrandTelegram size={18} />}
              variant="light"
              color="blue"
              fullWidth
              onClick={() => handleSendMessage('Telegram')}
            >
              Telegram Mesajı Gönder
            </Button>
            <Button
              leftSection={<IconMail size={18} />}
              variant="light"
              color="grape"
              fullWidth
              onClick={() => handleSendMessage('Email')}
            >
              Email Gönder
            </Button>
          </Stack>

          <Button
            variant="default"
            onClick={() => { setContactModalOpen(false); setSelectedPlayer(null); }}
            mt="md"
          >
            İptal
          </Button>
        </Stack>
      </Modal>

      <Stack spacing="xl">
        {/* Header */}
        <Group position="apart">
          <div>
            <Title order={1} size="h2" weight={700}>
              Terk Edilmiş Yatırımlar
            </Title>
            <Text size="sm" color="dimmed" mt={4}>
              Para yatırma sayfasını ziyaret edip işlemi tamamlamayan oyuncular
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={18} />}
            onClick={fetchAbandonedDeposits}
            variant="light"
          >
            Yenile
          </Button>
        </Group>

        {/* Stats Cards */}
        <SimpleGrid cols={4} breakpoints={[
          { maxWidth: 'md', cols: 2 },
          { maxWidth: 'xs', cols: 1 }
        ]}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="red">
                <IconTrendingDown size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Terk Eden Oyuncu
            </Text>
            <Text size="xl" weight={700}>
              {data?.players.length || 0}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Son {data?.periodInDays} günde
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="orange">
                <IconCoin size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Kayıp Potansiyel
            </Text>
            <Text size="xl" weight={700}>
              ₺{totalAttemptedAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Toplam denenen miktar
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="yellow">
                <IconUsers size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Ortalama Miktar
            </Text>
            <Text size="xl" weight={700}>
              ₺{avgAttemptedAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Oyuncu başına
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="grape">
                <IconClock size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Periyot
            </Text>
            <Text size="xl" weight={700}>
              {data?.periodInDays}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Gün
            </Text>
          </Card>
        </SimpleGrid>

        {/* Players Table */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group position="apart" mb="md">
            <Text size="lg" weight={600}>Oyuncu Listesi</Text>
            <Badge size="lg" variant="dot" color="red">
              {data?.players.length || 0} Oyuncu
            </Badge>
          </Group>

          {data?.players.length > 0 ? (
            <Table highlightOnHover>
              <thead>
                <tr>
                  <th>Oyuncu ID</th>
                  <th>Denenen Miktar</th>
                  <th>Son Deneme Tarihi</th>
                  <th>Süre</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {data.players.map((player) => {
                  const daysSince = player.lastAttemptDate
                    ? Math.floor((new Date() - new Date(player.lastAttemptDate)) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <tr key={player.playerId}>
                      <td>
                        <Anchor
                          component={RouterLink}
                          to={`/player/${player.playerId}`}
                          weight={500}
                        >
                          {player.playerId}
                        </Anchor>
                      </td>
                      <td>
                        <Badge
                          size="lg"
                          variant="light"
                          color="orange"
                          leftSection={<IconCoin size={14} />}
                        >
                          ₺{player.lastAttemptedAmount?.toFixed(2) || 'N/A'}
                        </Badge>
                      </td>
                      <td>
                        <Group spacing="xs">
                          <IconClock size={16} color="#868e96" />
                          <Text size="sm">
                            {player.lastAttemptDate
                              ? new Date(player.lastAttemptDate).toLocaleDateString('tr-TR')
                              : '-'}
                          </Text>
                        </Group>
                      </td>
                      <td>
                        {daysSince !== null ? (
                          <Badge
                            color={daysSince > 7 ? 'red' : daysSince > 3 ? 'orange' : 'yellow'}
                            variant="light"
                          >
                            {daysSince} gün önce
                          </Badge>
                        ) : (
                          <Text size="sm" color="dimmed">-</Text>
                        )}
                      </td>
                      <td>
                        <Group position="right" spacing="xs">
                          <Tooltip label="Profili Görüntüle">
                            <ActionIcon
                              component={RouterLink}
                              to={`/player/${player.playerId}`}
                              variant="light"
                              color="blue"
                            >
                              <IconEye size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="İletişime Geç">
                            <ActionIcon
                              variant="light"
                              color="green"
                              onClick={() => handleContactPlayer(player)}
                            >
                              <IconSend size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Menu shadow="md" width={200}>
                            <Menu.Target>
                              <ActionIcon variant="subtle">
                                <IconDotsVertical size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                icon={<IconEye size={14} />}
                                component={RouterLink}
                                to={`/player/${player.playerId}`}
                              >
                                Detaylı Profil
                              </Menu.Item>
                              <Menu.Item
                                icon={<IconSend size={14} />}
                                onClick={() => handleContactPlayer(player)}
                              >
                                Mesaj Gönder
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <Center py="xl">
              <Stack align="center" spacing="md">
                <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                  <IconTrendingDown size={32} />
                </ThemeIcon>
                <div style={{ textAlign: 'center' }}>
                  <Text size="lg" weight={600} mb={4}>
                    Terk edilmiş yatırım bulunamadı
                  </Text>
                  <Text size="sm" color="dimmed">
                    Son {data?.periodInDays} günde terk edilmiş yatırım yok. Harika! 🎉
                  </Text>
                </div>
              </Stack>
            </Center>
          )}
        </Card>

        {/* Tips Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder bg="blue.0">
          <Group spacing="md">
            <ThemeIcon size="lg" radius="md" variant="light" color="blue">
              <IconAlertCircle size={24} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text size="sm" weight={600} mb={4}>
                💡 İpucu: Terk Edilmiş Yatırımları Azaltın
              </Text>
              <Text size="xs" color="dimmed">
                • Yatırım sürecini basitleştirin<br />
                • Ödeme yöntemlerini çeşitlendirin<br />
                • Otomatik hatırlatma kuralları oluşturun<br />
                • İlk yatırım bonusu sunun
              </Text>
            </div>
          </Group>
        </Card>
      </Stack>
    </>
  );
}

export default AbandonedDepositsPage;