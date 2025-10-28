// frontend/src/components/RuleForm.jsx - Genişletilmiş Kural Türleri
import { useForm } from '@mantine/form';
import {
  Modal, Button, TextInput, Stack, Group, Select, JsonInput,
  Switch, Text, NumberInput, Alert, Paper, ThemeIcon,
  Stepper, Badge, Accordion, Divider, Tooltip, MultiSelect,
  SegmentedControl, Textarea
} from '@mantine/core';
import { DateInput, TimeInput, DateTimePicker } from '@mantine/dates';
import { useEffect, useState } from 'react';
import {
  IconTrash, IconRocket, IconInfoCircle, IconPlus,
  IconCheck, IconBolt, IconClock, IconUsers, IconTarget,
  IconCalendar, IconCoin, IconTrendingUp, IconTrendingDown,
  IconGift, IconCake, IconDeviceGamepad2, IconPercentage,
  IconAlertTriangle, IconStar, IconWallet
} from '@tabler/icons-react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

// Genişletilmiş tetikleyici türleri - BASİTLEŞTİRİLMİŞ
const triggerTypesList = [
  { value: 'INACTIVITY', label: '⏰ Pasiflik', description: 'Oyuncu X gün giriş yapmadığında' },
  { value: 'LOGIN_STREAK', label: '🔥 Giriş Serisi', description: 'X gün üst üste giriş yaptığında' },
  { value: 'SESSION_DURATION', label: '⌚ Oturum Süresi', description: 'Oturum belirli süreye ulaştığında' },
  { value: 'FIRST_DEPOSIT', label: '💎 İlk Yatırım', description: 'Oyuncunun ilk para yatırmasında' },
  { value: 'DEPOSIT_THRESHOLD', label: '💰 Yatırım Eşiği', description: 'Belirli miktara ulaşıldığında' },
  { value: 'WITHDRAWAL_THRESHOLD', label: '💸 Çekim Eşiği', description: 'Belirli çekim miktarında' },
  { value: 'LOW_BALANCE', label: '📉 Düşük Bakiye', description: 'Bakiye belirli seviyenin altına düştüğünde' },
  { value: 'HIGH_BALANCE', label: '📈 Yüksek Bakiye', description: 'Bakiye belirli seviyeyi aştığında' },
  { value: 'MULTIPLE_FAILED_DEPOSITS', label: '❌ Başarısız Yatırımlar', description: 'Birden fazla başarısız yatırım denemesi' },
  { value: 'WIN_STREAK', label: '🎯 Kazanma Serisi', description: 'X kez üst üste kazandığında' },
  { value: 'LOSS_STREAK', label: '💔 Kaybetme Serisi', description: 'X kez üst üste kaybettiğinde' },
  { value: 'GAME_SPECIFIC', label: '🎰 Oyun Özel', description: 'Belirli bir oyun oynanıldığında' },
  { value: 'BET_SIZE', label: '💵 Bahis Büyüklüğü', description: 'Belirli bahis miktarında' },
  { value: 'RTP_THRESHOLD', label: '📊 RTP Eşiği', description: 'Oyuncu RTP belirli seviyede' },
  { value: 'SEGMENT_ENTRY', label: '➕ Segment Girişi', description: 'Segmente dahil olduğunda' },
  { value: 'SEGMENT_EXIT', label: '➖ Segment Çıkışı', description: 'Segmentten çıktığında' },
  { value: 'TIME_BASED', label: '🕐 Zamanlı', description: 'Belirli tarih/saatte' },
  { value: 'BIRTHDAY', label: '🎂 Doğum Günü', description: 'Oyuncunun doğum gününde' },
  { value: 'ACCOUNT_ANNIVERSARY', label: '🎉 Hesap Yıldönümü', description: 'Kayıt yıldönümünde' },
  { value: 'BONUS_EXPIRY', label: '⏰ Bonus Süresi Dolacak', description: 'Bonus süresinin dolmasına yakın' },
  { value: 'EVENT', label: '⚡ Event', description: 'Özel bir event gerçekleştiğinde' }
];

// Aksiyon türleri
const actionTypes = [
  { value: 'SEND_TELEGRAM_MESSAGE', label: '📱 Telegram Mesajı' },
  { value: 'SEND_EMAIL', label: '📧 Email' },
  { value: 'SEND_SMS', label: '💬 SMS' },
  { value: 'SEND_PUSH_NOTIFICATION', label: '🔔 Push Notification' },
  { value: 'SEND_IN_APP_MESSAGE', label: '💭 Uygulama İçi Mesaj' },
  { value: 'TRIGGER_POPUP', label: '🪟 Popup Göster' },
  { value: 'ADD_BONUS', label: '🎁 Bonus Ekle' },
  { value: 'ADD_FREE_SPINS', label: '🎰 Free Spin Ekle' },
  { value: 'APPLY_CASHBACK', label: '💰 Cashback Uygula' },
  { value: 'ADJUST_LOYALTY_POINTS', label: '⭐ Loyalty Puanı' },
  { value: 'CHANGE_VIP_TIER', label: '👑 VIP Seviye Değiştir' },
  { value: 'ADD_TO_SEGMENT', label: '➕ Segmente Ekle' },
  { value: 'REMOVE_FROM_SEGMENT', label: '➖ Segmentten Çıkar' },
  { value: 'FLAG_ACCOUNT', label: '🚩 Hesabı İşaretle' },
  { value: 'CREATE_TASK', label: '📋 Görev Oluştur' },
  { value: 'WEBHOOK', label: '🔗 Webhook Çağır' },
  { value: 'CUSTOM_JAVASCRIPT', label: '⚙️ Özel JavaScript' }
];

function RuleForm({ isOpen, onClose, onSave, rule }) {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);
  const [active, setActive] = useState(0);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      isActive: true,
      triggerType: '',
      priority: 0,
      
      // Sıklık kontrolü
      maxExecutionsPerPlayer: null,
      cooldownPeriodDays: null,
      
      // Zamanlama
      startDate: null,
      endDate: null,
      activeHours: [],
      activeDaysOfWeek: [],
      
      // Koşullar
      conditions: {
        countries: [],
        vipTiers: [],
        minAge: null,
        deviceTypes: [],
        firstDepositOnly: false
      },
      
      // Trigger config - BOŞ OBJE OLARAK BAŞLAT
      config: {},
      
      conversionGoalEvent: '',
      testingEnabled: false,
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

  const getTriggerConfigFields = () => {
    const type = form.values.triggerType;
    
    switch(type) {
      case 'INACTIVITY':
        return (
          <NumberInput
            label="Pasiflik Süresi (Gün)"
            description="Kaç gün giriş yapmazsa tetiklensin?"
            placeholder="Örn: 14"
            min={1}
            value={form.values.config.days}
            onChange={(val) => form.setFieldValue('config.days', val)}
          />
        );
        
      case 'EVENT':
        return (
          <TextInput
            label="Event Adı"
            description="Hangi event gerçekleştiğinde tetiklensin?"
            placeholder="Örn: deposit_failed, big_win"
            value={form.values.config.eventName}
            onChange={(e) => form.setFieldValue('config.eventName', e.target.value)}
          />
        );
        
      case 'SEGMENT_ENTRY':
      case 'SEGMENT_EXIT':
        return (
          <Select
            label="Hedef Segment"
            description="Hangi segment?"
            placeholder="Segment seçin"
            data={segments}
            value={form.values.config.segmentId?.toString()}
            onChange={(val) => form.setFieldValue('config.segmentId', parseInt(val))}
          />
        );
        
      case 'TIME_BASED':
        return (
          <Stack spacing="md">
            <Select
              label="Zamanlama Türü"
              data={[
                { value: 'specific', label: 'Belirli Tarih/Saat' },
                { value: 'daily', label: 'Her Gün' },
                { value: 'weekly', label: 'Her Hafta' },
                { value: 'monthly', label: 'Her Ay' }
              ]}
              value={form.values.config.type}
              onChange={(val) => form.setFieldValue('config.type', val)}
            />
            
            {form.values.config.type === 'specific' && (
              <DateTimePicker
                label="Tarih ve Saat"
                placeholder="Seçin"
                value={form.values.config.datetime}
                onChange={(val) => form.setFieldValue('config.datetime', val)}
              />
            )}
            
            {form.values.config.type === 'daily' && (
              <TimeInput
                label="Saat"
                placeholder="14:00"
                value={form.values.config.time}
                onChange={(val) => form.setFieldValue('config.time', val)}
              />
            )}
          </Stack>
        );
        
      case 'DEPOSIT_THRESHOLD':
      case 'WITHDRAWAL_THRESHOLD':
        return (
          <Stack spacing="md">
            <NumberInput
              label="Miktar"
              description="Eşik değer"
              placeholder="1000"
              min={0}
              value={form.values.config.amount}
              onChange={(val) => form.setFieldValue('config.amount', val)}
            />
            <Select
              label="Periyot"
              data={[
                { value: 'total', label: 'Toplam (Tüm Zamanlar)' },
                { value: 'daily', label: 'Günlük' },
                { value: 'weekly', label: 'Haftalık' },
                { value: 'monthly', label: 'Aylık' }
              ]}
              value={form.values.config.period}
              onChange={(val) => form.setFieldValue('config.period', val)}
            />
          </Stack>
        );
        
      case 'LOGIN_STREAK':
        return (
          <NumberInput
            label="Ardışık Gün Sayısı"
            description="Kaç gün üst üste giriş yapmalı?"
            placeholder="7"
            min={1}
            value={form.values.config.consecutiveDays}
            onChange={(val) => form.setFieldValue('config.consecutiveDays', val)}
          />
        );
        
      case 'WIN_STREAK':
      case 'LOSS_STREAK':
        return (
          <Stack spacing="md">
            <NumberInput
              label="Ardışık Sayı"
              description="Kaç kez üst üste?"
              placeholder="3"
              min={1}
              value={form.values.config.consecutiveCount}
              onChange={(val) => form.setFieldValue('config.consecutiveCount', val)}
            />
            <NumberInput
              label="Minimum Bahis Miktarı (Opsiyonel)"
              placeholder="100"
              min={0}
              value={form.values.config.minBetAmount}
              onChange={(val) => form.setFieldValue('config.minBetAmount', val)}
            />
          </Stack>
        );
        
      case 'FIRST_DEPOSIT':
        return (
          <Select
            label="Tetikleme Zamanı"
            data={[
              { value: 'immediate', label: 'Anında' },
              { value: 'delay', label: 'Gecikmeli' }
            ]}
            value={form.values.config.trigger}
            onChange={(val) => form.setFieldValue('config.trigger', val)}
          />
        );
        
      case 'LOW_BALANCE':
      case 'HIGH_BALANCE':
        return (
          <NumberInput
            label="Eşik Değer"
            description="Bakiye limiti"
            placeholder="100"
            min={0}
            value={form.values.config.threshold}
            onChange={(val) => form.setFieldValue('config.threshold', val)}
          />
        );
        
      case 'BIRTHDAY':
        return (
          <NumberInput
            label="Kaç Gün Önce?"
            description="Doğum gününden kaç gün önce tetiklensin?"
            placeholder="3"
            min={0}
            max={30}
            value={form.values.config.daysBefore}
            onChange={(val) => form.setFieldValue('config.daysBefore', val)}
          />
        );
        
      case 'ACCOUNT_ANNIVERSARY':
        return (
          <NumberInput
            label="Yıldönümü (Yıl)"
            description="Kaçıncı yıl?"
            placeholder="1"
            min={1}
            value={form.values.config.yearsSince}
            onChange={(val) => form.setFieldValue('config.yearsSince', val)}
          />
        );
        
      case 'GAME_SPECIFIC':
        return (
          <Stack spacing="md">
            <TextInput
              label="Oyun ID"
              placeholder="slot-123"
              value={form.values.config.gameId}
              onChange={(e) => form.setFieldValue('config.gameId', e.target.value)}
            />
            <Select
              label="Event Türü"
              data={[
                { value: 'game_started', label: 'Oyun Başladı' },
                { value: 'game_ended', label: 'Oyun Bitti' },
                { value: 'big_win', label: 'Büyük Kazanç' }
              ]}
              value={form.values.config.eventType}
              onChange={(val) => form.setFieldValue('config.eventType', val)}
            />
          </Stack>
        );
        
      case 'BET_SIZE':
        return (
          <Group grow>
            <NumberInput
              label="Min Miktar"
              placeholder="500"
              min={0}
              value={form.values.config.minAmount}
              onChange={(val) => form.setFieldValue('config.minAmount', val)}
            />
            <NumberInput
              label="Max Miktar"
              placeholder="1000"
              min={0}
              value={form.values.config.maxAmount}
              onChange={(val) => form.setFieldValue('config.maxAmount', val)}
            />
          </Group>
        );
        
      case 'SESSION_DURATION':
        return (
          <Stack spacing="md">
            <NumberInput
              label="Süre (Dakika)"
              description="Oturum kaç dakika sürmeli?"
              placeholder="60"
              min={1}
              value={form.values.config.durationMinutes}
              onChange={(val) => form.setFieldValue('config.durationMinutes', val)}
            />
            <Select
              label="Tetikleme"
              data={[
                { value: 'ongoing', label: 'Oturum Devam Ederken' },
                { value: 'ended', label: 'Oturum Bittiğinde' }
              ]}
              value={form.values.config.trigger}
              onChange={(val) => form.setFieldValue('config.trigger', val)}
            />
          </Stack>
        );
        
      case 'MULTIPLE_FAILED_DEPOSITS':
        return (
          <Stack spacing="md">
            <NumberInput
              label="Başarısız Deneme Sayısı"
              placeholder="3"
              min={2}
              value={form.values.config.failedCount}
              onChange={(val) => form.setFieldValue('config.failedCount', val)}
            />
            <NumberInput
              label="Süre (Dakika)"
              description="Bu süre içinde kaç başarısız deneme?"
              placeholder="30"
              min={1}
              value={form.values.config.withinMinutes}
              onChange={(val) => form.setFieldValue('config.withinMinutes', val)}
            />
          </Stack>
        );
        
      case 'RTP_THRESHOLD':
        return (
          <Stack spacing="md">
            <NumberInput
              label="RTP Yüzdesi"
              placeholder="85"
              min={0}
              max={200}
              value={form.values.config.rtpPercentage}
              onChange={(val) => form.setFieldValue('config.rtpPercentage', val)}
            />
            <NumberInput
              label="Minimum Bahis Sayısı"
              description="Kaç bahisten sonra hesaplansın?"
              placeholder="100"
              min={1}
              value={form.values.config.minimumBets}
              onChange={(val) => form.setFieldValue('config.minimumBets', val)}
            />
            <Select
              label="Operatör"
              data={[
                { value: 'lessThan', label: 'Küçük (<)' },
                { value: 'greaterThan', label: 'Büyük (>)' }
              ]}
              value={form.values.config.operator}
              onChange={(val) => form.setFieldValue('config.operator', val)}
            />
          </Stack>
        );
        
      case 'BONUS_EXPIRY':
        return (
          <Stack spacing="md">
            <NumberInput
              label="Kaç Saat Önce?"
              description="Bonus süresinin dolmasına kaç saat kala?"
              placeholder="24"
              min={1}
              value={form.values.config.hoursBefore}
              onChange={(val) => form.setFieldValue('config.hoursBefore', val)}
            />
            <TextInput
              label="Bonus Türü (Opsiyonel)"
              placeholder="deposit_bonus"
              value={form.values.config.bonusType}
              onChange={(e) => form.setFieldValue('config.bonusType', e.target.value)}
            />
          </Stack>
        );
        
      default:
        return null;
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
    setActive((current) => (current < 3 ? current + 1 : current));
  };

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description,
        isActive: values.isActive,
        triggerType: values.triggerType,
        config: values.config,
        conditions: values.conditions,
        priority: values.priority,
        maxExecutionsPerPlayer: values.maxExecutionsPerPlayer,
        cooldownPeriodDays: values.cooldownPeriodDays,
        startDate: values.startDate,
        endDate: values.endDate,
        activeHours: values.activeHours,
        activeDaysOfWeek: values.activeDaysOfWeek,
        conversionGoalEvent: values.conversionGoalEvent,
        testingEnabled: values.testingEnabled,
        variants: values.variants.map((v) => ({
          ...v,
          actionPayload: typeof v.actionPayload === 'string' 
            ? JSON.parse(v.actionPayload) 
            : v.actionPayload,
        })),
      };
      onSave(payload, rule?.id);
    } catch (e) {
      alert('Varyant yapılandırması geçersiz JSON formatında.');
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
          placeholder="Örn: %20 Bonus Teklifi"
          {...form.getInputProps(`variants.${index}.name`)}
        />

        <Select
          withAsterisk
          label="Aksiyon Türü"
          placeholder="Aksiyon seçin"
          data={actionTypes}
          searchable
          {...form.getInputProps(`variants.${index}.actionType`)}
        />

        <NumberInput
          label="Ağırlık"
          description="Yüksek ağırlık = daha çok seçilir"
          placeholder="1"
          min={1}
          {...form.getInputProps(`variants.${index}.weight`)}
        />

        <JsonInput
          withAsterisk
          label="Aksiyon Parametreleri"
          description="JSON formatında aksiyon detayları"
          placeholder='{ "messageTemplate": "Merhaba!" }'
          minRows={4}
          formatOnBlur
          autosize
          {...form.getInputProps(`variants.${index}.actionPayload`)}
        />
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
            <IconRocket size={20} />
          </ThemeIcon>
          <Text size="lg" weight={600}>
            {rule ? 'Kuralı Düzenle' : 'Yeni Kural Oluştur'}
          </Text>
        </Group>
      }
      size="xl"
      closeOnClickOutside={false}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stepper active={active} breakpoint="sm">
          {/* Step 1: Temel Bilgiler */}
          <Stepper.Step
            label="Temel Bilgiler"
            description="Kural detayları"
            icon={<IconTarget size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <TextInput
                withAsterisk
                label="Kural Adı"
                placeholder="Örn: Pasif Oyuncu Geri Kazanımı"
                icon={<IconTarget size={16} />}
                {...form.getInputProps('name')}
              />

              <Textarea
                label="Açıklama"
                placeholder="Bu kuralın ne yaptığını açıklayın..."
                minRows={2}
                {...form.getInputProps('description')}
              />

              <Group grow>
                <Switch
                  label="Kural Aktif"
                  {...form.getInputProps('isActive', { type: 'checkbox' })}
                />
                <NumberInput
                  label="Öncelik"
                  description="Yüksek öncelikli kurallar önce çalışır"
                  placeholder="0"
                  min={0}
                  {...form.getInputProps('priority')}
                />
              </Group>

              <Divider label="Tetikleyici" labelPosition="center" />

              <Select
                withAsterisk
                label="Tetikleyici Türü"
                placeholder="Kural ne zaman çalışsın?"
                data={triggerTypesList}
                searchable
                {...form.getInputProps('triggerType')}
              />

              {form.values.triggerType && (
                <Paper p="md" radius="md" withBorder bg="blue.0">
                  <Text size="sm" weight={500} mb="xs">
                    Tetikleyici Yapılandırması
                  </Text>
                  {getTriggerConfigFields()}
                </Paper>
              )}

              <Group position="right" mt="xl">
                <Button onClick={nextStep}>İlerle</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Gelişmiş Ayarlar */}
          <Stepper.Step
            label="Gelişmiş Ayarlar"
            description="Koşullar ve zamanlama"
            icon={<IconClock size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Accordion variant="separated">
                {/* Sıklık Kontrolü */}
                <Accordion.Item value="frequency">
                  <Accordion.Control icon={<IconClock size={20} />}>
                    Sıklık Kontrolü
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <NumberInput
                        label="Oyuncu Başına Maksimum Çalışma"
                        description="Aynı oyuncu için kaç kez çalışabilir?"
                        placeholder="Sınırsız"
                        min={1}
                        {...form.getInputProps('maxExecutionsPerPlayer')}
                      />
                      <NumberInput
                        label="Bekleme Süresi (Gün)"
                        description="Aynı oyuncu için tekrar çalışma süresi"
                        placeholder="Bekleme yok"
                        min={1}
                        {...form.getInputProps('cooldownPeriodDays')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Zamanlama */}
                <Accordion.Item value="scheduling">
                  <Accordion.Control icon={<IconCalendar size={20} />}>
                    Zamanlama
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <DateInput
                        label="Başlangıç Tarihi"
                        placeholder="Kural ne zaman aktif olsun?"
                        {...form.getInputProps('startDate')}
                      />
                      <DateInput
                        label="Bitiş Tarihi"
                        placeholder="Kural ne zaman sona ersin?"
                        {...form.getInputProps('endDate')}
                      />
                      <MultiSelect
                        label="Aktif Saatler"
                        description="Hangi saatlerde çalışsın?"
                        placeholder="Tüm gün"
                        data={Array.from({ length: 24 }, (_, i) => ({
                          value: i.toString(),
                          label: `${i}:00`
                        }))}
                        {...form.getInputProps('activeHours')}
                      />
                      <MultiSelect
                        label="Aktif Günler"
                        description="Hangi günlerde çalışsın?"
                        placeholder="Her gün"
                        data={[
                          { value: '1', label: 'Pazartesi' },
                          { value: '2', label: 'Salı' },
                          { value: '3', label: 'Çarşamba' },
                          { value: '4', label: 'Perşembe' },
                          { value: '5', label: 'Cuma' },
                          { value: '6', label: 'Cumartesi' },
                          { value: '0', label: 'Pazar' }
                        ]}
                        {...form.getInputProps('activeDaysOfWeek')}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {/* Koşullar */}
                <Accordion.Item value="conditions">
                  <Accordion.Control icon={<IconUsers size={20} />}>
                    Hedefleme ve Koşullar
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <MultiSelect
                        label="Ülkeler"
                        description="Hangi ülkelerdeki oyuncular için?"
                        placeholder="Tüm ülkeler"
                        data={[
                          { value: 'TR', label: '🇹🇷 Türkiye' },
                          { value: 'DE', label: '🇩🇪 Almanya' },
                          { value: 'GB', label: '🇬🇧 İngiltere' },
                          { value: 'US', label: '🇺🇸 ABD' }
                        ]}
                        {...form.getInputProps('conditions.countries')}
                      />
                      <MultiSelect
                        label="VIP Seviyeleri"
                        placeholder="Tüm seviyeler"
                        data={[
                          { value: 'bronze', label: '🥉 Bronze' },
                          { value: 'silver', label: '🥈 Silver' },
                          { value: 'gold', label: '🥇 Gold' },
                          { value: 'platinum', label: '💎 Platinum' }
                        ]}
                        {...form.getInputProps('conditions.vipTiers')}
                      />
                      <MultiSelect
                        label="Cihaz Türleri"
                        placeholder="Tüm cihazlar"
                        data={[
                          { value: 'mobile', label: '📱 Mobil' },
                          { value: 'tablet', label: '📱 Tablet' },
                          { value: 'desktop', label: '💻 Masaüstü' }
                        ]}
                        {...form.getInputProps('conditions.deviceTypes')}
                      />
                      <NumberInput
                        label="Minimum Yaş"
                        placeholder="Yaş sınırı yok"
                        min={18}
                        {...form.getInputProps('conditions.minAge')}
                      />
                      <Switch
                        label="Sadece İlk Yatırım Yapanlar"
                        {...form.getInputProps('conditions.firstDepositOnly', { type: 'checkbox' })}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>

                {/* A/B Test */}
                <Accordion.Item value="abtest">
                  <Accordion.Control icon={<IconTarget size={20} />}>
                    A/B Test Ayarları
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack spacing="md">
                      <Switch
                        label="A/B Test Aktif"
                        description="Varyant performansı ölçülsün mü?"
                        {...form.getInputProps('testingEnabled', { type: 'checkbox' })}
                      />
                      {form.values.testingEnabled && (
                        <TextInput
                          label="Dönüşüm Hedefi"
                          description="Hangi event başarı sayılsın?"
                          placeholder="Örn: deposit_successful"
                          {...form.getInputProps('conversionGoalEvent')}
                        />
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              <Group position="apart" mt="xl">
                <Button variant="default" onClick={prevStep}>
                  Geri
                </Button>
                <Button onClick={nextStep}>İlerle</Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 3: Varyantlar */}
          <Stepper.Step
            label="Varyantlar"
            description="Aksiyonlar"
            icon={<IconRocket size={18} />}
          >
            <Stack spacing="md" mt="xl">
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm" weight={500} mb={4}>
                  Aksiyon Varyantları
                </Text>
                <Text size="xs" color="dimmed">
                  Farklı aksiyonları test edin. Her varyant ağırlığına göre dağıtılır.
                </Text>
              </Alert>

              {variantFields.length > 0 ? (
                <>{variantFields}</>
              ) : (
                <Paper p="xl" radius="md" withBorder>
                  <Stack align="center" spacing="md">
                    <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                      <IconRocket size={24} />
                    </ThemeIcon>
                    <Text size="sm" color="dimmed" align="center">
                      Henüz varyant eklenmedi
                    </Text>
                  </Stack>
                </Paper>
              )}

              <Button
                leftSection={<IconPlus size={18} />}
                variant="light"
                fullWidth
                onClick={() =>
                  form.insertListItem('variants', {
                    name: '',
                    actionType: '',
                    weight: 1,
                    actionPayload: '{}',
                  })
                }
              >
                Varyant Ekle
              </Button>

              <Group position="apart" mt="xl">
                <Button variant="default" onClick={prevStep}>
                  Geri
                </Button>
                <Button type="submit" leftSection={<IconCheck size={18} />}>
                  Kaydet
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