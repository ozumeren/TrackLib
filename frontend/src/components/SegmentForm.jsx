// frontend/src/components/SegmentForm.jsx - İyileştirilmiş UX/UI
import { useForm } from '@mantine/form';
import {
  Modal, Button, TextInput, Textarea, Group, Stack, Select,
  NumberInput, ActionIcon, Text, Paper, Stepper, Alert,
  Badge, ThemeIcon, Box, Divider, Code, Accordion
} from '@mantine/core';
import { useEffect, useState } from 'react';
import {
  IconTrash, IconPlus, IconInfoCircle, IconTarget,
  IconUsers, IconFilter, IconCheck
} from '@tabler/icons-react';

const ruleFacts = [
  { value: 'loginCount', label: '🔐 Giriş Sayısı', description: 'Son X gün içindeki giriş sayısı' },
  { value: 'totalDeposit', label: '💰 Toplam Yatırım', description: 'Tüm zamanlar toplamı' },
  { value: 'depositCount', label: '🎯 Yatırım Sayısı', description: 'Toplam yatırım işlem sayısı' },
  { value: 'lastLoginDays', label: '⏰ Son Giriş', description: 'Son girişten bu yana geçen gün' }
];

const ruleOperators = [
  { value: 'greaterThanOrEqual', label: '≥ Büyük veya Eşit', icon: '≥' },
  { value: 'lessThanOrEqual', label: '≤ Küçük veya Eşit', icon: '≤' },
  { value: 'greaterThan', label: '> Büyük', icon: '>' },
  { value: 'lessThan', label: '< Küçük', icon: '<' },
  { value: 'equals', label: '= Eşit', icon: '=' },
  { value: 'notEquals', label: '≠ Eşit Değil', icon: '≠' },
];

function SegmentForm({ isOpen, onClose, onSave, segment }) {
  const [active, setActive] = useState(0);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      rules: [],
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Segment adı zorunludur.'),
      rules: (value) => (value.length > 0 ? null : 'En az bir kural eklenmelidir.'),
    },
  });

  useEffect(() => {
    if (segment && segment.criteria && Array.isArray(segment.criteria.rules)) {
      form.setValues({
        name: segment.name || '',
        description: segment.description || '',
        rules: segment.criteria.rules,
      });
      setActive(0);
    } else {
      form.reset();
      form.setFieldValue('rules', []);
      setActive(0);
    }
  }, [segment, isOpen]);

  const handleSubmit = (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      criteria: {
        rules: values.rules,
      },
    };
    onSave(payload, segment?.id);
  };

  const nextStep = () => {
    if (active === 0) {
      // Validate step 1
      if (!form.values.name.trim()) {
        form.setFieldError('name', 'Segment adı zorunludur');
        return;
      }
    }
    setActive((current) => (current < 2 ? current + 1 : current));
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const getRulePreview = (rule) => {
    const fact = ruleFacts.find(f => f.value === rule.fact);
    const operator = ruleOperators.find(o => o.value === rule.operator);
    return `${fact?.label || rule.fact} ${operator?.icon || rule.operator} ${rule.value}${rule.periodInDays ? ` (${rule.periodInDays} gün)` : ''}`;
  };

  const ruleFields = form.values.rules.map((item, index) => (
    <Paper key={index} p="md" radius="md" withBorder mt="md">
      <Group position="apart" mb="md">
        <Badge size="lg" variant="dot">Kural {index + 1}</Badge>
        <ActionIcon
          color="red"
          variant="light"
          onClick={() => form.removeListItem('rules', index)}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Group>

      <Stack spacing="md">
        <Select
          label="Kural Türü"
          placeholder="Ne ölçmek istiyorsunuz?"
          data={ruleFacts.map(f => ({
            value: f.value,
            label: f.label,
            description: f.description
          }))}
          {...form.getInputProps(`rules.${index}.fact`)}
          icon={<IconTarget size={16} />}
        />

        <Group grow>
          <Select
            label="Operatör"
            placeholder="Karşılaştırma"
            data={ruleOperators}
            {...form.getInputProps(`rules.${index}.operator`)}
          />
          <NumberInput
            label="Değer"
            placeholder="Sayı"
            min={0}
            {...form.getInputProps(`rules.${index}.value`)}
          />
        </Group>

        {form.values.rules[index].fact === 'loginCount' && (
          <NumberInput
            label="Gün Periyodu"
            description="Son kaç gün içindeki girişler sayılsın?"
            placeholder="Örn: 30"
            min={1}
            icon={<IconInfoCircle size={16} />}
            {...form.getInputProps(`rules.${index}.periodInDays`)}
          />
        )}

        {/* Preview */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm" weight={500}>Kural Önizleme:</Text>
          <Code mt={4}>{getRulePreview(item)}</Code>
        </Alert>
      </Stack>
    </Paper>
  ));

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group spacing="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconUsers size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>
              {segment ? 'Segmenti Düzenle' : 'Yeni Segment Oluştur'}
            </Text>
            <Text size="xs" color="dimmed">
              Oyuncularınızı gruplandırın
            </Text>
          </div>
        </Group>
      }
      size="xl"
      padding="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stepper active={active} onStepClick={setActive} breakpoint="sm">
          {/* Step 1: Temel Bilgiler */}
          <Stepper.Step
            label="Temel Bilgiler"
            description="İsim ve açıklama"
            icon={<IconInfoCircle size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                Segment'e açıklayıcı bir isim ve açıklama verin.
              </Alert>

              <TextInput
                withAsterisk
                label="Segment Adı"
                description="Bu segmenti tanımlayan kısa bir isim"
                placeholder="Örn: VIP Oyuncular, Yeni Kayıtlar, Aktif Kullanıcılar"
                icon={<IconTarget size={16} />}
                {...form.getInputProps('name')}
              />

              <Textarea
                label="Açıklama"
                description="Bu segmentin amacı nedir? (opsiyonel)"
                placeholder="Örn: Son 30 günde 5'ten fazla giriş yapan ve toplam 1000 TRY üzeri yatırım yapmış oyuncular"
                minRows={3}
                {...form.getInputProps('description')}
              />

              <Group position="right" mt="xl">
                <Button onClick={nextStep}>İlerle</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Kriterler */}
          <Stepper.Step
            label="Kriterler"
            description="Filtreleme kuralları"
            icon={<IconFilter size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm" weight={500} mb={4}>
                  Segmente dahil olacak oyuncuları belirleyin
                </Text>
                <Text size="xs" color="dimmed">
                  Birden fazla kural ekleyebilirsiniz. Tüm kuralları sağlayan oyuncular bu segmente dahil olacaktır.
                </Text>
              </Alert>

              {/* Örnek Kurallar */}
              <Accordion variant="contained">
                <Accordion.Item value="examples">
                  <Accordion.Control icon={<IconInfoCircle size={16} />}>
                    📚 Örnek Segment Kuralları
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="xs">
                      <Text size="sm">
                        <strong>VIP Oyuncular:</strong> Toplam Yatırım ≥ 10000
                      </Text>
                      <Text size="sm">
                        <strong>Aktif Kullanıcılar:</strong> Giriş Sayısı ≥ 5 (30 gün)
                      </Text>
                      <Text size="sm">
                        <strong>Pasif Oyuncular:</strong> Son Giriş {'>'} 30
                      </Text>
                      <Text size="sm">
                        <strong>Yeni Kayıtlar:</strong> Yatırım Sayısı {'<'} 3
                      </Text>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              {/* Kural Listesi */}
              {ruleFields.length > 0 ? (
                <Box>
                  <Text size="sm" weight={500} mb="xs">
                    Eklenen Kurallar ({ruleFields.length})
                  </Text>
                  {ruleFields}
                </Box>
              ) : (
                <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                  <ThemeIcon size="xl" radius="xl" variant="light" color="gray" mx="auto" mb="md">
                    <IconFilter size={24} />
                  </ThemeIcon>
                  <Text size="sm" color="dimmed" mb="md">
                    Henüz kural eklenmedi
                  </Text>
                  <Text size="xs" color="dimmed">
                    En az bir kural ekleyerek başlayın
                  </Text>
                </Paper>
              )}

              {/* Kural Ekle Butonu */}
              <Button
                leftSection={<IconPlus size={18} />}
                variant="light"
                fullWidth
                onClick={() =>
                  form.insertListItem('rules', {
                    fact: '',
                    operator: 'greaterThanOrEqual',
                    value: 0,
                    periodInDays: 30,
                  })
                }
              >
                Yeni Kural Ekle
              </Button>

              <Group position="apart" mt="xl">
                <Button variant="default" onClick={prevStep}>
                  Geri
                </Button>
                <Button onClick={nextStep} disabled={form.values.rules.length === 0}>
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
                Segment oluşturuluyor! Son bir kez kontrol edin.
              </Alert>

              <Paper p="md" radius="md" withBorder>
                <Text size="sm" weight={500} color="dimmed" mb={4}>
                  Segment Adı
                </Text>
                <Text size="lg" weight={700}>
                  {form.values.name || 'Belirlenmedi'}
                </Text>
              </Paper>

              {form.values.description && (
                <Paper p="md" radius="md" withBorder>
                  <Text size="sm" weight={500} color="dimmed" mb={4}>
                    Açıklama
                  </Text>
                  <Text size="sm">{form.values.description}</Text>
                </Paper>
              )}

              <Paper p="md" radius="md" withBorder>
                <Text size="sm" weight={500} color="dimmed" mb="md">
                  Kriterler ({form.values.rules.length})
                </Text>
                <Stack spacing="xs">
                  {form.values.rules.map((rule, index) => (
                    <Group key={index} spacing="xs">
                      <Badge size="sm" variant="dot">{index + 1}</Badge>
                      <Code style={{ flex: 1 }}>{getRulePreview(rule)}</Code>
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
                  {segment ? 'Güncelle' : 'Oluştur'}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>
        </Stepper>
      </form>
    </Modal>
  );
}

export default SegmentForm;