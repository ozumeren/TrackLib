import { useForm } from '@mantine/form';
import { Modal, Button, TextInput, Textarea, Group, Stack, Select, NumberInput, ActionIcon, Text } from '@mantine/core';
import { useEffect } from 'react';
import { IconTrash } from '@tabler/icons-react';

// Kullanıcının seçebileceği kural türleri
const ruleFacts = [
  { value: 'loginCount', label: 'Giriş Sayısı (Son X Gün)' },
  { value: 'totalDeposit', label: 'Toplam Yatırım Tutarı' }
];

// Kullanıcının seçebileceği operatörler
const ruleOperators = [
  { value: 'greaterThanOrEqual', label: 'Büyük veya Eşit' },
  // Gelecekte eklenebilecekler: { value: 'lessThan', label: 'Küçük' }, { value: 'equals', label: 'Eşit' }
];

function SegmentForm({ isOpen, onClose, onSave, segment }) {
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      rules: [], // Artık bir metin değil, bir kural objeleri dizisi
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Segment adı zorunludur.'),
      rules: {
        fact: (value) => (value ? null : 'Kural türü seçilmelidir.'),
        operator: (value) => (value ? null : 'Operatör seçilmelidir.'),
      },
    },
  });

  // Düzenleme modunda, JSON'ı formun anlayacağı dizi formatına çevir
  useEffect(() => {
    if (segment && segment.criteria && Array.isArray(segment.criteria.rules)) {
      form.setValues({
        name: segment.name || '',
        description: segment.description || '',
        rules: segment.criteria.rules,
      });
    } else {
      // Yeni segment modunda formu ve kuralları sıfırla
      form.reset();
      form.setFieldValue('rules', []);
    }
  }, [segment, isOpen]);
  
  const handleSubmit = (values) => {
    // Formdaki kural dizisini, backend'in beklediği JSON formatına çevir
    const payload = {
      name: values.name,
      description: values.description,
      criteria: {
        rules: values.rules,
      },
    };
    onSave(payload, segment?.id);
  };

  // Formdaki kural satırlarını oluştur
  const ruleFields = form.values.rules.map((item, index) => (
    <Group key={index} mt="xs" grow>
      <Select
        placeholder="Kural Türü Seçin"
        data={ruleFacts}
        {...form.getInputProps(`rules.${index}.fact`)}
      />
      <Select
        placeholder="Operatör Seçin"
        data={ruleOperators}
        {...form.getInputProps(`rules.${index}.operator`)}
      />
      <NumberInput
        placeholder="Değer"
        {...form.getInputProps(`rules.${index}.value`)}
      />
      {/* "Giriş Sayısı" seçildiğinde gün periyodu girişi göster */}
      {form.values.rules[index].fact === 'loginCount' && (
        <NumberInput
          placeholder="Gün Periyodu"
          {...form.getInputProps(`rules.${index}.periodInDays`)}
        />
      )}
      <ActionIcon color="red" onClick={() => form.removeListItem('rules', index)}>
        <IconTrash size={16} />
      </ActionIcon>
    </Group>
  ));

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={segment ? 'Segmenti Düzenle' : 'Yeni Segment Oluştur'}
      size="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            withAsterisk
            label="Segment Adı"
            placeholder="Örn: Balinalar"
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Açıklama"
            placeholder="Bu segmentin ne işe yaradığını açıklayın"
            {...form.getInputProps('description')}
          />

          {/* Dinamik Kural Oluşturucu */}
          <Stack spacing="xs">
            <Text weight={500} size="sm">Kriterler</Text>
            {ruleFields.length > 0 ? ruleFields : <Text color="dimmed" align="center" p="md">Henüz kural eklenmedi.</Text>}
            <Group position="left" mt="md">
              <Button 
                variant="light" 
                onClick={() => form.insertListItem('rules', { fact: '', operator: 'greaterThanOrEqual', value: 0, periodInDays: 30 })}>
                + Kural Ekle
              </Button>
            </Group>
          </Stack>

          <Group position="right" mt="md">
            <Button variant="default" onClick={onClose}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default SegmentForm;

