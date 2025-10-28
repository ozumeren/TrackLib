// frontend/src/pages/Segments.jsx - İyileştirilmiş Versiyon
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Title, Card, Loader, Alert, Group, Text, Button, ActionIcon,
  SimpleGrid, Badge, Paper, Stack, TextInput, Center,
  ThemeIcon, Progress, Tooltip, Box, Menu, Modal
} from '@mantine/core';
import {
  IconAlertCircle, IconPencil, IconTrash, IconCheck, IconPlus,
  IconSearch, IconUsers, IconFilter, IconDotsVertical,
  IconEye, IconPlayerPlay, IconInfoCircle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import SegmentForm from '../components/SegmentForm';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

function Segments() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState(null);

  const fetchSegments = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/segments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSegments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Segment verileri çekilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [token]);

  const handleSaveSegment = async (values, segmentId) => {
    const successMessage = segmentId ? 'Segment başarıyla güncellendi.' : 'Segment başarıyla oluşturuldu.';
    try {
      if (segmentId) {
        await axios.put(`/api/segments/${segmentId}`, values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/segments', values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      setEditingSegment(null);
      fetchSegments();
      notifications.show({
        title: 'Başarılı!',
        message: successMessage,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'Segment kaydedilirken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };
  
  const handleDeleteSegment = async () => {
    if (!segmentToDelete) return;
    
    try {
      await axios.delete(`/api/segments/${segmentToDelete.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSegments();
      notifications.show({
        title: 'Başarılı!',
        message: 'Segment başarıyla silindi.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setDeleteModalOpen(false);
      setSegmentToDelete(null);
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'Segment silinirken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const filteredSegments = segments.filter(segment =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    segment.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlayers = segments.reduce((sum, seg) => sum + seg.playerCount, 0);

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Segmentler yükleniyor...</Text>
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

  return (
    <>
      <SegmentForm 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSegment(null); }}
        onSave={handleSaveSegment}
        segment={editingSegment}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setSegmentToDelete(null); }}
        title="Segmenti Sil"
        centered
      >
        <Stack>
          <Text>
            <strong>{segmentToDelete?.name}</strong> segmentini silmek istediğinizden emin misiniz?
          </Text>
          <Text size="sm" color="dimmed">
            Bu segment içindeki {segmentToDelete?.playerCount} oyuncu bu gruptan çıkarılacaktır.
          </Text>
          <Group position="right" mt="md">
            <Button variant="default" onClick={() => { setDeleteModalOpen(false); setSegmentToDelete(null); }}>
              İptal
            </Button>
            <Button color="red" onClick={handleDeleteSegment}>
              Sil
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack spacing="xl">
        {/* Header */}
        <Group position="apart">
          <div>
            <Title order={1} size="h2" weight={700}>
              Oyuncu Segmentleri
            </Title>
            <Text size="sm" color="dimmed" mt={4}>
              Oyuncularınızı gruplandırın ve hedefli kampanyalar oluşturun
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => { setEditingSegment(null); setIsModalOpen(true); }}
            size="md"
          >
            Yeni Segment
          </Button>
        </Group>

        {/* Stats Cards */}
        <SimpleGrid cols={3} breakpoints={[
          { maxWidth: 'md', cols: 2 },
          { maxWidth: 'xs', cols: 1 }
        ]}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="blue">
                <IconFilter size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Toplam Segment
            </Text>
            <Text size="xl" weight={700}>
              {segments.length}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Aktif gruplama sayısı
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="teal">
                <IconUsers size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Toplam Oyuncu
            </Text>
            <Text size="xl" weight={700}>
              {totalPlayers.toLocaleString('tr-TR')}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Segmentlerdeki oyuncu sayısı
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="grape">
                <IconPlayerPlay size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Ortalama Grup Büyüklüğü
            </Text>
            <Text size="xl" weight={700}>
              {segments.length > 0 ? Math.round(totalPlayers / segments.length).toLocaleString('tr-TR') : 0}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Oyuncu / Segment
            </Text>
          </Card>
        </SimpleGrid>

        {/* Search Bar */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <TextInput
            placeholder="Segment ara..."
            icon={<IconSearch size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="md"
          />
        </Card>

        {/* Segments Grid */}
        {filteredSegments.length > 0 ? (
          <SimpleGrid cols={3} breakpoints={[
            { maxWidth: 'md', cols: 2 },
            { maxWidth: 'xs', cols: 1 }
          ]}>
            {filteredSegments.map((segment) => {
              const fillPercentage = totalPlayers > 0 ? (segment.playerCount / totalPlayers) * 100 : 0;
              
              return (
                <Card key={segment.id} shadow="md" padding="lg" radius="md" withBorder>
                  <Stack spacing="md">
                    {/* Header */}
                    <Group position="apart">
                      <Badge size="lg" variant="dot" color="blue">
                        Aktif
                      </Badge>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <IconDotsVertical size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            icon={<IconPencil size={14} />}
                            onClick={() => {
                              setEditingSegment(segment);
                              setIsModalOpen(true);
                            }}
                          >
                            Düzenle
                          </Menu.Item>
                          <Menu.Item
                            icon={<IconEye size={14} />}
                            onClick={() => {
                              // TODO: Segment detay sayfası
                              console.log('View segment:', segment.id);
                            }}
                          >
                            Detayları Gör
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            icon={<IconTrash size={14} />}
                            color="red"
                            onClick={() => {
                              setSegmentToDelete(segment);
                              setDeleteModalOpen(true);
                            }}
                          >
                            Sil
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>

                    {/* Content */}
                    <div>
                      <Text size="lg" weight={700} mb={4}>
                        {segment.name}
                      </Text>
                      <Text size="sm" color="dimmed" lineClamp={2}>
                        {segment.description || 'Açıklama yok'}
                      </Text>
                    </div>

                    {/* Player Count */}
                    <Box>
                      <Group position="apart" mb={8}>
                        <Group spacing={4}>
                          <IconUsers size={16} color="#868e96" />
                          <Text size="sm" color="dimmed">Oyuncu Sayısı</Text>
                        </Group>
                        <Text size="lg" weight={700} color="blue">
                          {segment.playerCount.toLocaleString('tr-TR')}
                        </Text>
                      </Group>
                      <Progress
                        value={fillPercentage}
                        size="md"
                        radius="xl"
                        color="blue"
                      />
                      <Text size="xs" color="dimmed" mt={4}>
                        Toplam oyuncuların %{fillPercentage.toFixed(1)}'i
                      </Text>
                    </Box>

                    {/* Criteria Summary */}
                    {segment.criteria?.rules && segment.criteria.rules.length > 0 && (
                      <Box>
                        <Text size="xs" color="dimmed" mb={4}>
                          <IconInfoCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Kriterler
                        </Text>
                        <Stack spacing={4}>
                          {segment.criteria.rules.slice(0, 2).map((rule, idx) => (
                            <Badge key={idx} size="sm" variant="light" color="gray">
                              {rule.fact} {rule.operator} {rule.value}
                            </Badge>
                          ))}
                          {segment.criteria.rules.length > 2 && (
                            <Text size="xs" color="dimmed">
                              +{segment.criteria.rules.length - 2} kriter daha
                            </Text>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Center>
              <Stack align="center" spacing="md">
                <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                  <IconFilter size={32} />
                </ThemeIcon>
                <div style={{ textAlign: 'center' }}>
                  <Text size="lg" weight={600} mb={4}>
                    {searchQuery ? 'Segment bulunamadı' : 'Henüz segment oluşturulmamış'}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {searchQuery
                      ? 'Arama kriterlerinize uygun segment bulunamadı'
                      : 'İlk segmentinizi oluşturarak başlayın'}
                  </Text>
                </div>
                {!searchQuery && (
                  <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={() => { setEditingSegment(null); setIsModalOpen(true); }}
                    mt="md"
                  >
                    Yeni Segment Oluştur
                  </Button>
                )}
              </Stack>
            </Center>
          </Card>
        )}
      </Stack>
    </>
  );
}

export default Segments;