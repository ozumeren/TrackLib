import { useForm } from '@mantine/form';
import { Modal, Button, TextInput, Stack, Group, Select, JsonInput, Switch, Fieldset, Title, Text } from '@mantine/core';
import { useEffect } from 'react';
import { IconTrash } from '@tabler/icons-react';

function RuleForm({ isOpen, onClose, onSave, rule }) {
  const form = useForm({
    initialValues: {
      name: '',
      isActive: true,
      triggerType: '',
      config: '{}',
      conversionGoalEvent: '',
      variants: [],
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Kural adı zorunludur.'),
      triggerType: (value) => (value ? null : 'Tetikleyici türü seçilmelidir.'),
      variants: (value) => (value.length > 0 ? null : 'En az bir varyant eklenmelidir.'),
    },
  });

  // Düzenleme modunda, formun başlangıç değerlerini ayarla
  useEffect(() => {
    if (rule) {
      form.setValues({
        name: rule.name || '',
        isActive: rule.isActive,
        triggerType: rule.triggerType || '',
        config: rule.config ? JSON.stringify(rule.config, null, 2) : '{}',
        conversionGoalEvent: rule.conversionGoalEvent || '',
        variants: rule.variants.map(v => ({
          ...v,
          actionPayload: v.actionPayload ? JSON.stringify(v.actionPayload, null, 2) : '{}'
        }))
      });
    } else {
      // Yeni kural modunda formu sıfırla
      form.reset();
      form.setFieldValue('variants', []);
      form.setFieldValue('isActive', true);
    }
  }, [rule, isOpen]);

  const handleSubmit = (values) => {
    try {
      const payload = {
        ...values,
        config: JSON.parse(values.config),
        variants: values.variants.map(v => ({
          ...v,
          actionPayload: JSON.parse(v.actionPayload),
        })),
      };
      onSave(payload, rule?.id);
    } catch (e) {
      alert("Yapılandırma (config) veya Aksiyon İçeriği (actionPayload) alanlarından biri geçersiz JSON formatında.");
    }
  };

  const variantFields = form.values.variants.map((item, index) => (
    <Fieldset key={index} legend={`Varyant ${String.fromCharCode(65 + index)}`} mt="md">
      <Stack>
        <TextInput
          withAsterisk
          label="Varyant Adı"
          placeholder="Örn: %20 Bonus Teklifi"
          {...form.getInputProps(`variants.${index}.name`)}
        />
        <Select
          withAsterisk
          label="Aksiyon Türü"
          data={[{ value: 'SEND_TELEGRAM_MESSAGE', label: 'Telegram Mesajı Gönder' }]}
          {...form.getInputProps(`variants.${index}.actionType`)}
        />
        <JsonInput
          label="Aksiyon İçeriği (JSON)"
          placeholder='{ "messageTemplate": "Merhaba..." }'
          validationError="Geçersiz JSON"
          formatOnBlur
          autosize
          minRows={3}
          {...form.getInputProps(`variants.${index}.actionPayload`)}
        />
         <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={14} />}
            onClick={() => form.removeListItem('variants', index)}
            style={{ alignSelf: 'flex-end' }}
        >
            Varyantı Sil
        </Button>
      </Stack>
    </Fieldset>
  ));

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={rule ? 'Kuralı Düzenle' : 'Yeni Kural Oluştur'}
      size="xl"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            withAsterisk
            label="Kural Adı"
            placeholder="Örn: Pasif Oyuncu A/B Testi"
            {...form.getInputProps('name')}
          />
          <Switch
            label="Kural Aktif"
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />
          <Select
            withAsterisk
            label="Tetikleyici Türü"
            placeholder="Bir tetikleyici seçin"
            data={[
              { value: 'INACTIVITY', label: 'Pasiflik' },
              { value: 'EVENT', label: 'Olay' },
              { value: 'SEGMENT_ENTRY', label: 'Segment Girişi' },
            ]}
            {...form.getInputProps('triggerType')}
          />
          <JsonInput
            label="Tetikleyici Ayarları (JSON)"
            placeholder='{ "minutes": 2 } veya { "segmentId": 1 }'
            validationError="Geçersiz JSON"
            formatOnBlur
            autosize
            minRows={2}
            {...form.getInputProps('config')}
          />
          <TextInput
            label="Dönüşüm Hedefi Olayı (A/B Testi için)"
            placeholder="Örn: login_successful"
            {...form.getInputProps('conversionGoalEvent')}
          />
          
          <Stack mt="lg">
            <Title order={5}>A/B Testi Varyantları</Title>
            {variantFields.length > 0 ? variantFields : <Text color="dimmed" size="sm" align="center" p="md">Aksiyonları tanımlamak için bir varyant ekleyin.</Text>}
            <Button
              variant="light"
              onClick={() => form.insertListItem('variants', { name: '', actionType: 'SEND_TELEGRAM_MESSAGE', actionPayload: '{}' })}
              mt="sm"
            >
              + Varyant Ekle
            </Button>
          </Stack>

          <Group position="right" mt="xl">
            <Button variant="default" onClick={onClose}>İptal</Button>
            <Button type="submit">Kaydet</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default RuleForm;

