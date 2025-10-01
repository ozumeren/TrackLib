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
      // Config artık ayrı alanlarda yönetilecek
      config_inactivity_minutes: 2,
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

  // Segment listesini backend'den çek
  useEffect(() => {
    const fetchSegments = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/segments/list', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Veriyi Select bileşeninin anlayacağı formata çevir
        setSegments(response.data.map(s => ({ value: s.id.toString(), label: s.name })));
      } catch (error) {
        console.error("Segment listesi çekilemedi", error);
      }
    };
    if (isOpen) {
      fetchSegments();
    }
  }, [isOpen, token]);

  // Düzenleme modunda, formu doldur
  useEffect(() => {
    if (rule) {
      form.setValues({
        name: rule.name || '',
        isActive: rule.isActive,
        triggerType: rule.triggerType || '',
        conversionGoalEvent: rule.conversionGoalEvent || '',
        config_inactivity_minutes: rule.config?.minutes || 2,
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
    // Dinamik form alanlarından backend'in beklediği 'config' JSON objesini oluştur
    let config = {};
    if (values.triggerType === 'INACTIVITY') {
      config = { minutes: values.config_inactivity_minutes };
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
      {/* ... (Varyant form alanları aynı kalıyor) ... */}
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
              { value: 'INACTIVITY', label: 'Pasiflik' },
              { value: 'EVENT', label: 'Belirli Bir Olay' },
              { value: 'SEGMENT_ENTRY', label: 'Segment Girişi' },
            ]}
            {...form.getInputProps('triggerType')}
          />

          {/* --- YENİ: DİNAMİK TETİKLEYİCİ AYARLARI --- */}
          {form.values.triggerType === 'INACTIVITY' && (
            <NumberInput
              label="Pasiflik Süresi (Dakika)"
              placeholder="Örn: 20160 (14 gün)"
              {...form.getInputProps('config_inactivity_minutes')}
            />
          )}
          {form.values.triggerType === 'EVENT' && (
             <TextInput
              label="İzlenecek Olayın Adı"
              placeholder="Örn: deposit_failed"
              {...form.getInputProps('config_event_eventName')}
            />
          )}
          {form.values.triggerType === 'SEGMENT_ENTRY' && (
            <Select
              label="Hedef Segment"
              placeholder="Bir segment seçin"
              data={segments}
              {...form.getInputProps('config_segment_entry_segmentId')}
            />
          )}
          
          <TextInput
            label="Dönüşüm Hedefi Olayı (A/B Testi için)"
            placeholder="Örn: login_successful"
            {...form.getInputProps('conversionGoalEvent')}
          />
          
          <Stack mt="lg">
            <Title order={5}>A/B Testi Varyantları</Title>
            {variantFields}
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

