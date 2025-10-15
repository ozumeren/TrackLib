// frontend/src/components/RuleForm.jsx - İyileştirilmiş UX/UI
import { useForm } from '@mantine/form';
import {
  Modal, Button, TextInput, Stack, Group, Select, JsonInput,
  Switch, Fieldset, Text, NumberInput, Alert, Paper, ThemeIcon,
  Stepper, Badge, Code, Accordion, Box, Divider, Tooltip
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  IconTrash, IconRocket, IconInfoCircle, IconPlus,
  IconCheck, IconBolt, IconClock, IconUsers, IconTarget
} from '@tabler/icons-react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

function RuleForm({ isOpen, onClose, onSave, rule }) {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);
  const [active, setActive] = useState(0);

  const form = useForm({
    initialValues: {
      name: '',
      isActive: true,
      triggerType: '',
      config_inactivity_days: 14,
      config_event_eventName: '',
      config_segment_entry_segmentId: '',
      conversionGoalEvent: '',
      variants: [],
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Kural adı zorunludur.'),
      triggerType: (value) => (value ? null : 'Tetikleyici türü seçilmelidir.'),
      variants: (value) => (value.length > 0 ? null : 'En az bir varyant eklenmelidir.'),
    },
  });

  useEffect(() => {
    const fetchSegments = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/segments/list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSegments(
          response.data.map((s) => ({ value: s.id.toString(), label: s.name }))
        );
      } catch (error) {
        console.error('Segment listesi çekilemedi', error);
      }
    };
    if (isOpen) {
      fetchSegments();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (rule) {
      form.setValues({
        name: rule.name || '',
        isActive: rule.isActive,
        triggerType: rule.triggerType || '',
        conversionGoalEvent: rule.conversionGoalEvent || '',
        config_inactivity_days: rule.config?.days || 14,
        config_event_eventName: rule.config?.eventName || '',
        config_segment_entry_segmentId: rule.config?.segmentId?.toString() || '',
        variants: rule.variants.map((v) => ({
          ...v,
          actionPayload: v.actionPayload
            ? JSON.stringify(v.actionPayload, null, 2)
            : '{}',
        })),
      });
      setActive(0);
    } else {
      form.reset();
      setActive(0);
    }
  }, [rule, isOpen]);

  const handleSubmit = (values) => {
    let config = {};
    if (values.triggerType === 'INACTIVITY') {
      config = { days: values.config_inactivity_days };
    } else if (values.triggerType === 'EVENT') {
      config = { eventName: values.config_event_eventName };
    } else if (values.triggerType === 'SEGMENT_ENTRY') {
      config = { segmentId: parseInt(values.config_segment_entry_segmentId, 10) };
    }

    try {
      const payload = {
        name: values.name,
        isActive: values.isActive,
        triggerType: values.triggerType,
        conversionGoalEvent: values.conversionGoalEvent,
        config: config,
        variants: values.variants.map((v) => ({
          ...v,
          actionPayload: JSON.parse(v.actionPayload),
        })),
      };
      onSave(payload, rule?.id);
    } catch (e) {
      alert('Aksiyon İçeriği (actionPayload) geçersiz JSON formatında.');
    }
  };

  const nextStep = () => {
    if (active === 0) {
      if (!form.values.name.trim()) {
        form.setFieldError('name', 'Kural adı zorunludur');
        return;
      }
      if (!form.values.triggerType) {
        form.setFieldError('triggerType', 'Tetikleyici türü seçilmelidir');
        return;
      }
    }
    setActive((current) => (current < 2 ? current + 1 : current));
  };

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  const getTriggerIcon = (type) => {
    switch (type) {
      case 'INACTIVITY':
        return IconClock;
      case 'EVENT':
        return IconBolt;
      case 'SEGMENT_ENTRY':
        return IconUsers;
      default:
        return IconTarget;
    }
  };

  const getTriggerDescription = (type) => {
    switch (type) {
      case 'INACTIVITY':
        return 'Oyuncu belirli bir süre boyunca pasif kaldığında tetiklenir';
      case 'EVENT':
        return 'Belirli bir event gerçekleştiğinde tetiklenir (örn: deposit_failed)';
      case 'SEGMENT_ENTRY':
        return 'Oyuncu belirli bir segmente girdiğinde tetiklenir';
      default:
        return '';
    }
  };

  const variantFields = form.values.variants.map((item, index) => (
    <Paper key={index} p="md" radius="md" withBorder mt="md">
      <Group position="apart" mb="md">
        <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
          Varyant {String.fromCharCode(65 + index)}
        </Badge>
        <Button
          color="red"
          variant="light"
          size="xs"
          leftSection={<IconTrash size={14} />}
          onClick={() => form.removeListItem('variants', index)}
        >
          Sil
        </Button>
      </Group>

      <Stack spacing="md">
        <TextInput
          withAsterisk
          label="Varyant Adı"
          description="Bu varyantı tanımlayan açıklayıcı bir isim"
          placeholder="Örn: %20 Bonus Teklifi, Hoşgeldin Mesajı"
          {...form.getInputProps(`variants.${index}.name`)}
        />

        <Select
          withAsterisk
          label="Aksiyon Türü"
          description="Bu varyant hangi aksiyonu gerçekleştirecek?"
          data={[
            {
              value: 'SEND_TELEGRAM_MESSAGE',
              label: '📱 Telegram Mesajı Gönder',
            },
            {
              value: 'FORWARD_TO_META_ADS',
              label: '📘 Meta (Facebook) Ads',
            },
            {
              value: 'FORWARD_TO_GOOGLE_ADS',
              label: '📊 Google Ads',
            },
          ]}
          {...form.getInputProps(`variants.${index}.actionType`)}
        />

        <JsonInput
          label="Aksiyon İçeriği (JSON)"
          description="Aksiyonun detaylarını JSON formatında girin"
          placeholder='{ "messageTemplate": "Merhaba {playerId}..." }'
          validationError="Geçersiz JSON formatı"
          formatOnBlur
          autosize
          minRows={4}
          {...form.getInputProps(`variants.${index}.actionPayload`)}
        />

        {/* JSON Örnekleri */}
        <Accordion variant="contained">
          <Accordion.Item value="examples">
            <Accordion.Control icon={<IconInfoCircle size={16} />}>
              📝 JSON Örnekleri
            </Accordion.Control>
            <Accordion.Panel>
              <Stack spacing="xs">
                <Text size="xs" weight={500}>
                  Telegram Mesajı:
                </Text>
                <Code block>
                  {`{
  "messageTemplate": "Merhaba {playerId}, %20 bonus için son şansın!"
}`}
                </Code>
                <Text size="xs" weight={500} mt="sm">
                  Meta Ads:
                </Text>
                <Code block>
                  {`{
  "eventName": "Purchase",
  "value": 100,
  "currency": "TRY"
}`}
                </Code>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Paper>
  ));

  const TriggerIcon = getTriggerIcon(form.values.triggerType);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group spacing="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconRocket size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>
              {rule ? 'Kuralı Düzenle' : 'Yeni Kural Oluştur'}
            </Text>
            <Text size="xs" color="dimmed">
              Otomatik kampanya ve A/B testi
            </Text>
          </div>
        </Group>
      }
      size="xl"
      padding="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stepper active={active} onStepClick={setActive} breakpoint="sm">
          {/* Step 1: Temel Ayarlar */}
          <Stepper.Step
            label="Temel Ayarlar"
            description="Kural bilgileri"
            icon={<IconInfoCircle size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                Kural'a açıklayıcı bir isim verin ve tetikleyici tipini seçin.
              </Alert>

              <TextInput
                withAsterisk
                label="Kural Adı"
                description="Bu kuralı tanımlayan açıklayıcı bir isim"
                placeholder="Örn: Pasif Oyuncu Geri Kazanımı, İlk Yatırım Bonusu"
                icon={<IconTarget size={16} />}
                {...form.getInputProps('name')}
              />

              <Switch
                label="Kural Aktif"
                description="Kapalıysa kural çalışmaz"
                {...form.getInputProps('isActive', { type: 'checkbox' })}
              />

              <Select
                withAsterisk
                label="Tetikleyici Türü"
                description="Kural ne zaman çalışsın?"
                data={[
                  {
                    value: 'INACTIVITY',
                    label: '⏰ Oyuncu Pasifleştiğinde',
                  },
                  {
                    value: 'EVENT',
                    label: '⚡ Belirli Bir Eylem Gerçekleştiğinde',
                  },
                  {
                    value: 'SEGMENT_ENTRY',
                    label: '👥 Oyuncu Grubuna Girdiğinde',
                  },
                ]}
                {...form.getInputProps('triggerType')}
              />

              {/* Tetikleyici Detayları */}
              {form.values.triggerType && (
                <Paper p="md" radius="md" withBorder bg="blue.0">
                  <Group spacing="sm" mb="xs">
                    <ThemeIcon size="sm" radius="xl" variant="light" color="blue">
                      <TriggerIcon size={16} />
                    </ThemeIcon>
                    <Text size="sm" weight={500}>
                      Seçilen Tetikleyici
                    </Text>
                  </Group>
                  <Text size="xs" color="dimmed">
                    {getTriggerDescription(form.values.triggerType)}
                  </Text>
                </Paper>
              )}

              {form.values.triggerType === 'INACTIVITY' && (
                <NumberInput
                  label="Pasiflik Süresi (Gün)"
                  description="Kaç gün boyunca giriş yapmazsa tetiklensin?"
                  placeholder="Örn: 14"
                  min={1}
                  icon={<IconClock size={16} />}
                  {...form.getInputProps('config_inactivity_days')}
                />
              )}

              {form.values.triggerType === 'EVENT' && (
                <TextInput
                  withAsterisk
                  label="İzlenecek Eylemin Adı"
                  description="Hangi event gerçekleştiğinde tetiklensin?"
                  placeholder="Örn: deposit_failed, registration_completed"
                  icon={<IconBolt size={16} />}
                  {...form.getInputProps('config_event_eventName')}
                />
              )}

              {form.values.triggerType === 'SEGMENT_ENTRY' && (
                <Select
                  withAsterisk
                  label="Hedef Oyuncu Grubu"
                  description="Hangi segmente girince tetiklensin?"
                  placeholder="Bir segment seçin"
                  data={segments}
                  icon={<IconUsers size={16} />}
                  {...form.getInputProps('config_segment_entry_segmentId')}
                />
              )}

              <TextInput
                label="Dönüşüm Hedefi (A/B Testi için)"
                description="Hangi event başarı sayılsın? (opsiyonel)"
                placeholder="Örn: deposit_successful, login_successful"
                icon={<IconTarget size={16} />}
                {...form.getInputProps('conversionGoalEvent')}
              />

              <Group position="right" mt="xl">
                <Button onClick={nextStep}>İlerle</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Varyantlar */}
          <Stepper.Step
            label="Varyantlar"
            description="A/B test aksiyonları"
            icon={<IconRocket size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm" weight={500} mb={4}>
                  A/B Test Varyantları Ekleyin
                </Text>
                <Text size="xs" color="dimmed">
                  Farklı aksiyonları test edin. Her varyant rastgele dağıtılacaktır.
                </Text>
              </Alert>

              {/* Varyant Listesi */}
              {variantFields.length > 0 ? (
                <Box>
                  <Text size="sm" weight={500} mb="xs">
                    Eklenen Varyantlar ({variantFields.length})
                  </Text>
                  {variantFields}
                </Box>
              ) : (
                <Paper
                  p="xl"
                  radius="md"
                  withBorder
                  style={{ textAlign: 'center' }}
                >
                  <ThemeIcon
                    size="xl"
                    radius="xl"
                    variant="light"
                    color="gray"
                    mx="auto"
                    mb="md"
                  >
                    <IconRocket size={24} />
                  </ThemeIcon>
                  <Text size="sm" color="dimmed" mb="md">
                    Henüz varyant eklenmedi
                  </Text>
                  <Text size="xs" color="dimmed">
                    En az bir varyant ekleyerek başlayın
                  </Text>
                </Paper>
              )}

              {/* Varyant Ekle Butonu */}
              <Button
                leftSection={<IconPlus size={18} />}
                variant="light"
                fullWidth
                onClick={() =>
                  form.insertListItem('variants', {
                    name: '',
                    actionType: '',
                    actionPayload: '{}',
                  })
                }
              >
                Yeni Varyant Ekle
              </Button>

              <Group position="apart" mt="xl">
                <Button variant="default" onClick={prevStep}>
                  Geri
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={form.values.variants.length === 0}
                >
                  İlerle
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 3: Özet */}
          <Stepper.Step
            label="Özet"
            description="Kontrol edin"
            icon={<IconCheck size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                Kural oluşturuluyor! Son bir kez kontrol edin.
              </Alert>

              <Paper p="md" radius="md" withBorder>
                <Group position="apart" mb="md">
                  <Text size="sm" weight={500} color="dimmed">
                    Kural Adı
                  </Text>
                  <Badge color={form.values.isActive ? 'green' : 'gray'}>
                    {form.values.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </Group>
                <Text size="lg" weight={700}>
                  {form.values.name || 'Belirlenmedi'}
                </Text>
              </Paper>

              <Paper p="md" radius="md" withBorder>
                <Text size="sm" weight={500} color="dimmed" mb="md">
                  Tetikleyici
                </Text>
                <Group spacing="sm">
                  <ThemeIcon size="md" radius="md" variant="light" color="blue">
                    <TriggerIcon size={18} />
                  </ThemeIcon>
                  <Stack spacing={4}>
                    <Text size="sm" weight={500}>
                      {form.values.triggerType === 'INACTIVITY' && 'Pasiflik'}
                      {form.values.triggerType === 'EVENT' && 'Event'}
                      {form.values.triggerType === 'SEGMENT_ENTRY' &&
                        'Segment Girişi'}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {form.values.triggerType === 'INACTIVITY' &&
                        `${form.values.config_inactivity_days} gün pasif`}
                      {form.values.triggerType === 'EVENT' &&
                        form.values.config_event_eventName}
                      {form.values.triggerType === 'SEGMENT_ENTRY' &&
                        segments.find(
                          (s) =>
                            s.value === form.values.config_segment_entry_segmentId
                        )?.label}
                    </Text>
                  </Stack>
                </Group>
              </Paper>

              {form.values.conversionGoalEvent && (
                <Paper p="md" radius="md" withBorder>
                  <Text size="sm" weight={500} color="dimmed" mb={4}>
                    Dönüşüm Hedefi
                  </Text>
                  <Code>{form.values.conversionGoalEvent}</Code>
                </Paper>
              )}

              <Paper p="md" radius="md" withBorder>
                <Text size="sm" weight={500} color="dimmed" mb="md">
                  Varyantlar ({form.values.variants.length})
                </Text>
                <Stack spacing="xs">
                  {form.values.variants.map((variant, index) => (
                    <Group key={index} spacing="xs">
                      <Badge
                        size="sm"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'cyan' }}
                      >
                        {String.fromCharCode(65 + index)}
                      </Badge>
                      <Text size="sm" weight={500}>
                        {variant.name}
                      </Text>
                      <Text size="xs" color="dimmed">
                        ({variant.actionType})
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>

              <Divider my="md" />

              <Group position="apart">
                <Button variant="default" onClick={prevStep}>
                  Geri
                </Button>
                <Button type="submit" leftSection={<IconCheck size={18} />}>
                  {rule ? 'Güncelle' : 'Oluştur'}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </form>
    </Modal>
  );
}

export default RuleForm;