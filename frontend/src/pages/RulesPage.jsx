// frontend/src/pages/RulesPage.jsx - İyileştirilmiş Versiyon
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Title, Card, Loader, Alert, Group, Text, Button, ActionIcon,
  SimpleGrid, Badge, Stack, TextInput, Center, ThemeIcon,
  Switch, Tooltip, Menu, Modal, Paper, Progress, Box
} from '@mantine/core';
import {
  IconAlertCircle, IconPencil, IconTrash, IconPlus,
  IconSearch, IconRocket, IconTarget, IconDotsVertical,
  IconCheck, IconX, IconInfoCircle, IconChartBar,
  IconBolt, IconClock, IconUsers
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import RuleForm from '../components/RuleForm';
import { useAuth } from '../AuthContext';

function RulesPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const fetchRules = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRules(response.data);
    } catch (err) {
      setError('Kurallar çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleSaveRule = async (values, ruleId) => {
    try {
      if (ruleId) {
        await axios.put(`/api/rules/${ruleId}`, values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/rules', values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setIsFormModalOpen(false);
      setSelectedRule(null);
      fetchRules();
      notifications.show({
        title: 'Başarılı!',
        message: ruleId ? 'Kural güncellendi.' : 'Kural oluşturuldu.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'Kural kaydedilirken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const handleToggleActive = async (ruleId, currentStatus) => {
    try {
      await axios.patch(`/api/rules/${ruleId}/toggle`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRules();
      notifications.show({
        title: 'Başarılı!',
        message: `Kural ${!currentStatus ? 'aktifleştirildi' : 'devre dışı bırakıldı'}.`,
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'Durum değiştirilemedi.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };
  
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      await axios.delete(`/api/rules/${ruleToDelete.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRules();
      notifications.show({
        title: 'Başarılı!',
        message: 'Kural silindi.',
        color: 'teal',
        icon: <IconCheck size={16} />,
      });
      setDeleteModalOpen(false);
      setRuleToDelete(null);
    } catch (err) {
      notifications.show({
        title: 'Hata!',
        message: 'Kural silinirken bir sorun oluştu.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    }
  };

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRulesCount = rules.filter(r => r.isActive).length;
  const totalVariants = rules.reduce((sum, r) => sum + (r.variantsCount || 0), 0);

  const getTriggerIcon = (type) => {
    switch(type) {
      case 'INACTIVITY': return IconClock;
      case 'EVENT': return IconBolt;
      case 'SEGMENT_ENTRY': return IconUsers;
      default: return IconTarget;
    }
  };

  const getTriggerLabel = (type) => {
    switch(type) {
      case 'INACTIVITY': return 'Pasiflik';
      case 'EVENT': return 'Event';
      case 'SEGMENT_ENTRY': return 'Segment Girişi';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '70vh' }}>
        <Stack align="center" spacing="md">
          <Loader size="xl" />
          <Text size="sm" color="dimmed">Kurallar yükleniyor...</Text>
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
      <RuleForm 
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setSelectedRule(null); }}
        onSave={handleSaveRule}
        rule={selectedRule}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setRuleToDelete(null); }}
        title="Kuralı Sil"
        centered
      >
        <Stack>
          <Text>
            <strong>{ruleToDelete?.name}</strong> kuralını silmek istediğinizden emin misiniz?
          </Text>
          <Text size="sm" color="dimmed">
            Bu kural ve bağlı {ruleToDelete?.variantsCount || 0} varyant kalıcı olarak silinecektir.
          </Text>
          <Group position="right" mt="md">
            <Button variant="default" onClick={() => { setDeleteModalOpen(false); setRuleToDelete(null); }}>
              İptal
            </Button>
            <Button color="red" onClick={handleDeleteRule}>
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
              Otomasyon Kuralları
            </Title>
            <Text size="sm" color="dimmed" mt={4}>
              Otomatik kampanyalar ve A/B testleri yönetin
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => { setSelectedRule(null); setIsFormModalOpen(true); }}
            size="md"
          >
            Yeni Kural
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
                <IconRocket size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Toplam Kural
            </Text>
            <Text size="xl" weight={700}>
              {rules.length}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Otomasyon sayısı
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="green">
                <IconCheck size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Aktif Kurallar
            </Text>
            <Text size="xl" weight={700}>
              {activeRulesCount}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              Şu anda çalışıyor
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart" mb="xs">
              <ThemeIcon size="xl" radius="md" variant="light" color="grape">
                <IconChartBar size={24} />
              </ThemeIcon>
            </Group>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700} mb={4}>
              Toplam Varyant
            </Text>
            <Text size="xl" weight={700}>
              {totalVariants}
            </Text>
            <Text size="xs" color="dimmed" mt={4}>
              A/B test varyasyonları
            </Text>
          </Card>
        </SimpleGrid>

        {/* Search Bar */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <TextInput
            placeholder="Kural ara..."
            icon={<IconSearch size={18} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="md"
          />
        </Card>

        {/* Rules Grid */}
        {filteredRules.length > 0 ? (
          <SimpleGrid cols={2} breakpoints={[
            { maxWidth: 'md', cols: 1 }
          ]}>
            {filteredRules.map((rule) => {
              const TriggerIcon = getTriggerIcon(rule.triggerType);
              
              return (
                <Card key={rule.id} shadow="md" padding="lg" radius="md" withBorder>
                  <Stack spacing="md">
                    {/* Header */}
                    <Group position="apart">
                      <Group spacing="xs">
                        <Switch
                          checked={rule.isActive}
                          onChange={() => handleToggleActive(rule.id, rule.isActive)}
                          color="teal"
                          size="md"
                        />
                        <Badge
                          size="lg"
                          variant="dot"
                          color={rule.isActive ? 'green' : 'gray'}
                        >
                          {rule.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </Group>
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
                              setSelectedRule(rule);
                              setIsFormModalOpen(true);
                            }}
                          >
                            Düzenle
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            icon={<IconTrash size={14} />}
                            color="red"
                            onClick={() => {
                              setRuleToDelete(rule);
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
                        {rule.name}
                      </Text>
                      <Group spacing="xs">
                        <ThemeIcon size="sm" radius="md" variant="light" color="blue">
                          <TriggerIcon size={14} />
                        </ThemeIcon>
                        <Text size="sm" color="dimmed">
                          {getTriggerLabel(rule.triggerType)}
                        </Text>
                      </Group>
                    </div>

                    {/* Variants Info */}
                    <Paper p="md" radius="md" withBorder bg="gray.0">
                      <Group position="apart" mb={8}>
                        <Text size="sm" weight={500}>
                          A/B Test Varyantları
                        </Text>
                        <Badge size="sm" variant="filled">
                          {rule.variantsCount || 0}
                        </Badge>
                      </Group>
                      {rule.variantsCount > 0 && (
                        <Progress
                          value={100}
                          size="sm"
                          radius="xl"
                          color="grape"
                          mt="xs"
                        />
                      )}
                    </Paper>

                    {/* Conversion Goal */}
                    {rule.conversionGoalEvent && (
                      <Box>
                        <Group spacing={4} mb={4}>
                          <IconTarget size={14} color="#868e96" />
                          <Text size="xs" color="dimmed">Dönüşüm Hedefi</Text>
                        </Group>
                        <Badge size="sm" variant="light" color="yellow">
                          {rule.conversionGoalEvent}
                        </Badge>
                      </Box>
                    )}

                    {/* Config Info */}
                    {rule.config && (
                      <Box>
                        <Text size="xs" color="dimmed" mb={4}>
                          <IconInfoCircle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          Yapılandırma
                        </Text>
                        <Stack spacing={4}>
                          {Object.entries(rule.config).map(([key, value]) => (
                            <Text key={key} size="xs" color="dimmed">
                              {key}: <strong>{value}</strong>
                            </Text>
                          ))}
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
                  <IconRocket size={32} />
                </ThemeIcon>
                <div style={{ textAlign: 'center' }}>
                  <Text size="lg" weight={600} mb={4}>
                    {searchQuery ? 'Kural bulunamadı' : 'Henüz kural oluşturulmamış'}
                  </Text>
                  <Text size="sm" color="dimmed">
                    {searchQuery
                      ? 'Arama kriterlerinize uygun kural bulunamadı'
                      : 'İlk otomasyonunuzu oluşturarak başlayın'}
                  </Text>
                </div>
                {!searchQuery && (
                  <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={() => { setSelectedRule(null); setIsFormModalOpen(true); }}
                    mt="md"
                  >
                    Yeni Kural Oluştur
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

export default RulesPage;