import { useForm } from '@mantine/form';
import { Modal, Button, TextInput, Stack, Group, Select, JsonInput, Switch, Fieldset, Title, Text, NumberInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

function RuleForm({ isOpen, onClose, onSave, rule }) {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);

  const form = useForm({
    initialValues: {
      name: '',
      isActive: true,
      triggerType: '',
      config_inactivity_days: 14, // Değişiklik: Dakika yerine gün
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

  // Fetch segment list from the backend
  useEffect(() => {
    const fetchSegments = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/segments/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSegments(response.data.map(s => ({ value: s.id.toString(), label: s.name })));
      } catch (error) {
        console.error("Segment listesi çekilemedi", error);
      }
    };
    if (isOpen) {
      fetchSegments();
    }
  }, [isOpen, token]);

  // Populate form when editing a rule
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
        variants: rule.variants.map(v => ({
          ...v,
          actionPayload: v.actionPayload ? JSON.stringify(v.actionPayload, null, 2) : '{}'
        }))
      });
    } else {
      form.reset();
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
        variants: values.variants.map(v => ({
          ...v,
          actionPayload: JSON.parse(v.actionPayload),
        })),
      };
      onSave(payload, rule?.id);
    } catch (e) {
      alert("Aksiyon İçeriği (actionPayload) geçersiz JSON formatında.");
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
          data={[
            { value: 'SEND_TELEGRAM_MESSAGE', label: 'Telegram Mesajı Gönder' },
            { value: 'FORWARD_TO_META_ADS', label: 'Meta (Facebook) Ads\'e İlet' },
            { value: 'FORWARD_TO_GOOGLE_ADS', label: 'Google Ads\'e İlet' },
          ]}
          {...form.getInputProps(`variants.${index}.actionType`)}
        />
        <JsonInput
          label="Aksiyon İçeriği (JSON)"
          placeholder='{ "messageTemplate": "Merhaba..." } veya { "eventName": "Purchase" }'
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
            {...form.getInputProps('name')}
          />
          <Switch
            label="Kural Aktif"
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />
          <Select
            withAsterisk
            label="Tetikleyici Türü"
            data={[
              { value: 'INACTIVITY', label: 'Oyuncu Pasifleştiğinde' },
              { value: 'EVENT', label: 'Belirli Bir Eylem Gerçekleştiğinde' },
              { value: 'SEGMENT_ENTRY', label: 'Oyuncu Grubuna Girdiğinde' },
            ]}
            {...form.getInputProps('triggerType')}
          />
          
          {/* --- CORRECTED DYNAMIC TRIGGER SETTINGS --- */}
          {form.values.triggerType === 'INACTIVITY' && (
             <NumberInput
              label="Pasiflik Süresi (Gün)"
              placeholder="Örn: 14"
              {...form.getInputProps('config_inactivity_days')}
            />
          )}
          {form.values.triggerType === 'EVENT' && (
             <TextInput
              label="İzlenecek Eylemin Adı"
              placeholder="Örn: deposit_failed"
              {...form.getInputProps('config_event_eventName')}
            />
          )}
          {form.values.triggerType === 'SEGMENT_ENTRY' && (
            <Select
              label="Hedef Oyuncu Grubu"
              placeholder="Bir grup seçin"
              data={segments}
              {...form.getInputProps('config_segment_entry_segmentId')}
            />
          )}
          
          <TextInput
            label="Dönüşüm Hedefi Eylemi (A/B Testi için)"
            placeholder="Örn: login_successful"
            {...form.getInputProps('conversionGoalEvent')}
          />
          
          <Stack mt="lg">
            <Title order={5}>A/B Testi Varyantları</Title>
            {variantFields.length > 0 ? variantFields : <Text color="dimmed" size="sm" align="center" p="md">Aksiyonları tanımlamak için bir varyant ekleyin.</Text>}
            <Button
              variant="light"
              onClick={() => form.insertListItem('variants', { name: '', actionType: '', actionPayload: '{}' })}
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

