// frontend/src/components/DomConfigBuilder.jsx - Geliştirilmiş Miktar Takipli Versiyon
import { useState } from 'react';
import {
  Card, Stack, Group, Text, Button, TextInput, Select,
  ActionIcon, Paper, Badge, Divider, Accordion, Code,
  Tooltip, Alert, ThemeIcon, Box, JsonInput, CopyButton,
  Tabs, Switch, NumberInput
} from '@mantine/core';
import {
  IconPlus, IconTrash, IconInfoCircle, IconCode,
  IconCheck, IconCopy, IconWand, IconDownload,
  IconUpload, IconEye, IconCurrencyDollar
} from '@tabler/icons-react';

// Event türleri - Basit format
const eventTypes = [
  { value: 'deposit_page_view', label: '💰 Para Yatırma Sayfası' },
  { value: 'withdrawal_page_view', label: '💸 Para Çekme Sayfası' },
  { value: 'registration_page_view', label: '📝 Kayıt Sayfası' },
  { value: 'login_page_view', label: '🔐 Giriş Sayfası' },
  { value: 'game_page_view', label: '🎮 Oyun Sayfası' },
  { value: 'bonus_page_view', label: '🎁 Bonus Sayfası' },
  { value: 'deposit_successful', label: '✅ Yatırım Başarılı' },
  { value: 'deposit_failed', label: '❌ Yatırım Başarısız' },
  { value: 'withdrawal_requested', label: '💸 Çekim Talebi' },
  { value: 'withdrawal_successful', label: '✅ Çekim Başarılı' },
  { value: 'withdrawal_failed', label: '❌ Çekim Başarısız' },
  { value: 'game_started', label: '🎯 Oyun Başladı' },
  { value: 'game_ended', label: '🏁 Oyun Bitti' },
  { value: 'button_click', label: '🖱️ Buton Tıklama' },
  { value: 'form_submit', label: '📋 Form Gönderimi' },
  { value: 'custom', label: '⚙️ Özel Event' }
];

// Trigger türleri
const triggerTypes = [
  { value: 'click', label: '🖱️ Tıklama (click)' },
  { value: 'submit', label: '📤 Form Gönder (submit)' },
  { value: 'load', label: '⚡ Sayfa Yüklenme (load)' },
  { value: 'change', label: '🔄 Değişiklik (change)' },
  { value: 'focus', label: '👁️ Odaklanma (focus)' },
  { value: 'blur', label: '👁️ Odak Kaybı (blur)' }
];

// Miktar gerektiren event'ler
const amountRequiredEvents = [
  'deposit_successful',
  'deposit_failed',
  'withdrawal_requested',
  'withdrawal_successful',
  'withdrawal_failed'
];

// Şablon örnekleri - MİKTAR TAKİPLİ
const templates = {
  deposit: {
    name: 'Para Yatırma Tracking (Miktar ile)',
    rules: [
      {
        eventName: 'deposit_page_view',
        selector: '.deposit-button, #deposit-btn, button[data-action="deposit"]',
        trigger: 'click',
        parameters: { page: 'deposit' }
      },
      {
        eventName: 'deposit_successful',
        selector: '.deposit-form, #depositForm',
        trigger: 'submit',
        parameters: { 
          page: 'deposit',
          currency: 'TRY'
        },
        amountSelector: '#deposit-amount, input[name="amount"], .amount-input',
        extractAmount: true
      }
    ]
  },
  withdrawal: {
    name: 'Para Çekme Tracking (Miktar ile)',
    rules: [
      {
        eventName: 'withdrawal_page_view',
        selector: '.withdrawal-button, #withdraw-btn',
        trigger: 'click',
        parameters: { page: 'withdrawal' }
      },
      {
        eventName: 'withdrawal_requested',
        selector: '.withdrawal-form, #withdrawalForm',
        trigger: 'submit',
        parameters: { 
          page: 'withdrawal',
          currency: 'TRY'
        },
        amountSelector: '#withdrawal-amount, input[name="amount"], .amount-input',
        extractAmount: true
      }
    ]
  },
  registration: {
    name: 'Kayıt Formu Tracking',
    rules: [
      {
        eventName: 'registration_page_view',
        selector: '#registration-form, .signup-form',
        trigger: 'submit',
        parameters: { form_type: 'registration' }
      }
    ]
  },
  games: {
    name: 'Oyun Tracking',
    rules: [
      {
        eventName: 'game_started',
        selector: '.game-tile, .game-card',
        trigger: 'click',
        parameters: { game_id: 'data-game-id' }
      }
    ]
  },
  complete: {
    name: 'Komple iGaming Setup (Miktar Takipli)',
    rules: [
      {
        eventName: 'deposit_page_view',
        selector: '.deposit-button',
        trigger: 'click',
        parameters: { page: 'deposit' }
      },
      {
        eventName: 'deposit_successful',
        selector: '.deposit-form',
        trigger: 'submit',
        parameters: { currency: 'TRY' },
        amountSelector: '#deposit-amount',
        extractAmount: true
      },
      {
        eventName: 'withdrawal_page_view',
        selector: '.withdrawal-button',
        trigger: 'click',
        parameters: { page: 'withdrawal' }
      },
      {
        eventName: 'withdrawal_requested',
        selector: '.withdrawal-form',
        trigger: 'submit',
        parameters: { currency: 'TRY' },
        amountSelector: '#withdrawal-amount',
        extractAmount: true
      },
      {
        eventName: 'game_started',
        selector: '.game-tile',
        trigger: 'click',
        parameters: { game_id: 'data-game-id' }
      },
      {
        eventName: 'registration_page_view',
        selector: '#registration-form',
        trigger: 'submit',
        parameters: { form_type: 'registration' }
      }
    ]
  }
};

function DomConfigBuilder({ value, onChange }) {
  const [rules, setRules] = useState(() => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return parsed?.rules || [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState('visual');
  const [showPreview, setShowPreview] = useState(false);

  // Kural ekle
  const addRule = () => {
    const newRule = {
      eventName: '',
      selector: '',
      trigger: 'click',
      parameters: {},
      extractAmount: false,
      amountSelector: ''
    };
    const newRules = [...rules, newRule];
    setRules(newRules);
    updateParent(newRules);
  };

  // Kural sil
  const removeRule = (index) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    updateParent(newRules);
  };

  // Kural güncelle
  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    
    if (field === 'parameters') {
      try {
        newRules[index][field] = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        return; // Invalid JSON
      }
    } else {
      newRules[index][field] = value;
    }
    
    setRules(newRules);
    updateParent(newRules);
  };

  // Parent'a gönder
  const updateParent = (newRules) => {
    const config = { rules: newRules };
    onChange(JSON.stringify(config, null, 2));
  };

  // Şablon yükle
  const loadTemplate = (templateKey) => {
    const template = templates[templateKey];
    setRules(template.rules);
    updateParent(template.rules);
  };

  // JSON'dan import
  const importFromJson = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.rules && Array.isArray(parsed.rules)) {
        setRules(parsed.rules);
        updateParent(parsed.rules);
      }
    } catch (error) {
      alert('Geçersiz JSON formatı!');
    }
  };

  const generatedConfig = { rules };

  // Test kodu oluştur - MİKTAR TAKİBİ DAHİL
  const generateTestCode = () => {
    return `// Test Script - Browser Console'da Çalıştırın
// Bu kod, yapılandırdığınız selector'ların ve miktar alanlarının sayfada bulunup bulunmadığını test eder

console.log('🧪 DomConfig Test Başlatılıyor...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const rules = ${JSON.stringify(rules, null, 2)};

rules.forEach((rule, index) => {
  console.log(\`\\n📌 Kural #\${index + 1}: \${rule.eventName}\`);
  console.log(\`   Selector: \${rule.selector}\`);
  console.log(\`   Trigger: \${rule.trigger}\`);
  
  // Ana selector kontrolü
  try {
    const elements = document.querySelectorAll(rule.selector);
    
    if (elements.length > 0) {
      console.log(\`   ✅ ANA ELEMENT BULUNDU: \${elements.length} element\`);
      elements.forEach((el, i) => {
        console.log(\`      [\${i}]:\`, el);
      });
    } else {
      console.log(\`   ❌ ANA ELEMENT BULUNAMADI\`);
      console.log(\`   💡 İpucu: Sayfayı inspect edin ve doğru selector'ı bulun\`);
    }
  } catch (error) {
    console.log(\`   ⚠️  HATA: Geçersiz selector - \${error.message}\`);
  }

  // Miktar selector kontrolü
  if (rule.extractAmount && rule.amountSelector) {
    console.log(\`\\n   💰 Miktar Takibi Aktif\`);
    console.log(\`   Miktar Selector: \${rule.amountSelector}\`);
    
    try {
      const amountElements = document.querySelectorAll(rule.amountSelector);
      
      if (amountElements.length > 0) {
        console.log(\`   ✅ MİKTAR ALANI BULUNDU: \${amountElements.length} element\`);
        amountElements.forEach((el, i) => {
          const value = el.value || el.textContent || el.innerText;
          console.log(\`      [\${i}]: \`, el, ' → Değer:', value);
        });
      } else {
        console.log(\`   ❌ MİKTAR ALANI BULUNAMADI\`);
        console.log(\`   💡 İpucu: Miktar input alanının selector'ını kontrol edin\`);
      }
    } catch (error) {
      console.log(\`   ⚠️  HATA: Geçersiz miktar selector - \${error.message}\`);
    }
  }
});

console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Test tamamlandı!');
console.log('💡 Elementler bulunamadıysa, sayfayı inspect edip doğru selector\'ları bulun.');
`;
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="visual" leftSection={<IconWand size={16} />}>
            Görsel Düzenleyici
          </Tabs.Tab>
          <Tabs.Tab value="code" leftSection={<IconCode size={16} />}>
            JSON Editör
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconDownload size={16} />}>
            Şablonlar
          </Tabs.Tab>
        </Tabs.List>

        {/* Görsel Düzenleyici */}
        <Tabs.Panel value="visual" pt="md">
          <Stack spacing="md">
            <Group position="apart">
              <Text size="lg" weight={600}>Tracking Kuralları</Text>
              <Group spacing="xs">
                <Button
                  leftSection={<IconEye size={16} />}
                  variant="light"
                  size="xs"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Önizlemeyi Gizle' : 'JSON Önizleme'}
                </Button>
                <CopyButton value={generateTestCode()}>
                  {({ copied, copy }) => (
                    <Tooltip label="Browser console'da test etmek için kopyala">
                      <Button
                        leftSection={copied ? <IconCheck size={16} /> : <IconCode size={16} />}
                        variant="light"
                        size="xs"
                        color={copied ? 'teal' : 'blue'}
                        onClick={copy}
                      >
                        {copied ? 'Test Kodu Kopyalandı!' : 'Test Kodu Kopyala'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Group>

            {showPreview && (
              <Paper p="md" withBorder>
                <Text size="sm" weight={500} mb="xs">JSON Önizleme:</Text>
                <Code block style={{ fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
                  {JSON.stringify(generatedConfig, null, 2)}
                </Code>
              </Paper>
            )}

            {/* Kurallar */}
            <Stack spacing="md">
              {rules.map((rule, index) => (
                <Paper key={index} p="md" withBorder>
                  <Stack spacing="md">
                    <Group position="apart">
                      <Badge size="lg" variant="filled">
                        Kural #{index + 1}
                      </Badge>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeRule(index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>

                    {/* Event Seçimi */}
                    <Select
                      label="Event Türü"
                      description="Ne izlensin?"
                      placeholder="Event seçin"
                      data={eventTypes}
                      value={rule.eventName}
                      onChange={(val) => updateRule(index, 'eventName', val)}
                      searchable
                      required
                    />

                    {rule.eventName === 'custom' && (
                      <TextInput
                        label="Özel Event Adı"
                        placeholder="Örn: custom_button_click"
                        value={rule.eventName}
                        onChange={(e) => updateRule(index, 'eventName', e.target.value)}
                      />
                    )}

                    {/* Selector */}
                    <Stack spacing={4}>
                      <TextInput
                        label="CSS Selector"
                        description="Hangi HTML elementi izlensin?"
                        placeholder=".button-class, #element-id, [data-action='deposit']"
                        value={rule.selector}
                        onChange={(e) => updateRule(index, 'selector', e.target.value)}
                        required
                      />
                      <Group spacing="xs">
                        <Button
                          size="xs"
                          variant="subtle"
                          compact
                          onClick={() => updateRule(index, 'selector', '.deposit-button, #deposit-btn')}
                        >
                          💰 Yatırım butonu
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          compact
                          onClick={() => updateRule(index, 'selector', '.withdrawal-button, #withdraw-btn')}
                        >
                          💸 Çekim butonu
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          compact
                          onClick={() => updateRule(index, 'selector', '.deposit-form, #depositForm')}
                        >
                          📝 Yatırım formu
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          compact
                          onClick={() => updateRule(index, 'selector', '.game-tile, .game-card')}
                        >
                          🎮 Oyun kartı
                        </Button>
                      </Group>
                    </Stack>

                    {/* Trigger */}
                    <Select
                      label="Tetikleme Tipi"
                      description="Ne zaman event gönderilsin?"
                      placeholder="Trigger seçin"
                      data={triggerTypes}
                      value={rule.trigger}
                      onChange={(val) => updateRule(index, 'trigger', val)}
                      required
                    />

                    {/* YENI: Miktar Takibi Bölümü */}
                    {amountRequiredEvents.includes(rule.eventName) && (
                      <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                        <Stack spacing="md">
                          <Group>
                            <ThemeIcon size="lg" color="green" variant="light">
                              <IconCurrencyDollar size={20} />
                            </ThemeIcon>
                            <div>
                              <Text size="sm" weight={600}>💰 Miktar Takibi</Text>
                              <Text size="xs" color="dimmed">
                                Para yatırma/çekme işlemlerinde miktarı otomatik olarak yakala
                              </Text>
                            </div>
                          </Group>

                          <Switch
                            label="Miktar takibini etkinleştir"
                            description="Event gönderilirken miktar bilgisi de eklensin"
                            checked={rule.extractAmount || false}
                            onChange={(e) => updateRule(index, 'extractAmount', e.currentTarget.checked)}
                          />

                          {rule.extractAmount && (
                            <>
                              <Divider />
                              
                              <Stack spacing={4}>
                                <TextInput
                                  label="Miktar Input Selector"
                                  description="Miktarın yazıldığı input alanının CSS selector'ı"
                                  placeholder="#deposit-amount, input[name='amount'], .amount-input"
                                  value={rule.amountSelector || ''}
                                  onChange={(e) => updateRule(index, 'amountSelector', e.target.value)}
                                  required
                                  leftSection={<IconCurrencyDollar size={16} />}
                                />
                                <Group spacing="xs">
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    compact
                                    onClick={() => updateRule(index, 'amountSelector', '#deposit-amount')}
                                  >
                                    💰 #deposit-amount
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    compact
                                    onClick={() => updateRule(index, 'amountSelector', '#withdrawal-amount')}
                                  >
                                    💸 #withdrawal-amount
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    compact
                                    onClick={() => updateRule(index, 'amountSelector', 'input[name="amount"]')}
                                  >
                                    📝 input[name="amount"]
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    compact
                                    onClick={() => updateRule(index, 'amountSelector', '.amount-input')}
                                  >
                                    🔢 .amount-input
                                  </Button>
                                </Group>
                              </Stack>

                              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                                <Text size="xs" weight={500} mb={4}>
                                  💡 Nasıl Çalışır?
                                </Text>
                                <Stack spacing={4}>
                                  <Text size="xs">
                                    1. Kullanıcı miktar alanına bir değer girer (örn: 500)
                                  </Text>
                                  <Text size="xs">
                                    2. Form gönderildiğinde veya buton tıklandığında
                                  </Text>
                                  <Text size="xs">
                                    3. Sistem otomatik olarak miktar değerini yakalar
                                  </Text>
                                  <Text size="xs">
                                    4. Event'e <Code>amount: 500</Code> parametresi eklenir
                                  </Text>
                                </Stack>
                              </Alert>

                              <Alert icon={<IconInfoCircle size={16} />} color="yellow" variant="light">
                                <Text size="xs" weight={500}>
                                  ⚠️ Önemli: Miktar input alanının doğru selector'ını bulun!
                                </Text>
                                <Text size="xs" mt={4}>
                                  Sayfada "Inspect Element" yapıp miktar input'unun ID, class veya name attribute'unu kontrol edin.
                                </Text>
                              </Alert>
                            </>
                          )}
                        </Stack>
                      </Paper>
                    )}

                    {/* Parameters */}
                    <JsonInput
                      label="Ek Parametreler (JSON)"
                      description="Event ile gönderilecek ekstra bilgiler"
                      placeholder='{"currency": "TRY", "page": "deposit"}'
                      value={JSON.stringify(rule.parameters || {}, null, 2)}
                      onChange={(val) => updateRule(index, 'parameters', val)}
                      minRows={3}
                      formatOnBlur
                      autosize
                    />
                  </Stack>
                </Paper>
              ))}

              <Button
                leftSection={<IconPlus size={16} />}
                onClick={addRule}
                variant="light"
                fullWidth
              >
                Yeni Kural Ekle
              </Button>
            </Stack>
          </Stack>
        </Tabs.Panel>

        {/* JSON Editör */}
        <Tabs.Panel value="code" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              <Text size="sm">
                Doğrudan JSON formatında düzenleyebilirsiniz. Değişiklikler otomatik kaydedilir.
              </Text>
            </Alert>

            <JsonInput
              value={JSON.stringify(generatedConfig, null, 2)}
              onChange={(val) => importFromJson(val)}
              minRows={15}
              maxRows={30}
              formatOnBlur
              autosize
            />

            <Group position="right">
              <CopyButton value={JSON.stringify(generatedConfig, null, 2)}>
                {({ copied, copy }) => (
                  <Button
                    leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    color={copied ? 'teal' : 'blue'}
                    onClick={copy}
                  >
                    {copied ? 'Kopyalandı!' : 'JSON\'u Kopyala'}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>
        </Tabs.Panel>

        {/* Şablonlar */}
        <Tabs.Panel value="templates" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue">
              <Text size="sm">
                Hazır şablonlardan birini seçerek hızlıca başlayabilirsiniz. Şablon yüklendikten sonra düzenleyebilirsiniz.
              </Text>
            </Alert>

            <Stack spacing="xs">
              {Object.entries(templates).map(([key, template]) => (
                <Paper key={key} p="md" withBorder>
                  <Group position="apart">
                    <div>
                      <Text weight={500}>{template.name}</Text>
                      <Text size="xs" color="dimmed">
                        {template.rules.length} kural içerir
                        {template.rules.some(r => r.extractAmount) && ' • 💰 Miktar takipli'}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      leftSection={<IconDownload size={14} />}
                      onClick={() => loadTemplate(key)}
                    >
                      Yükle
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <Divider my="md" label="Örnek Kullanım" />

            <Card withBorder>
              <Stack spacing="md">
                <Text size="sm" weight={500}>📚 Selector Örnekleri:</Text>

                <div>
                  <Code>.deposit-button</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    "deposit-button" class'ına sahip elementler
                  </Text>
                </div>

                <div>
                  <Code>#submit-btn</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    "submit-btn" ID'sine sahip element
                  </Text>
                </div>

                <div>
                  <Code>[data-action="deposit"]</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    data-action attribute'u "deposit" olan elementler
                  </Text>
                </div>

                <div>
                  <Code>input[name="amount"]</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    name attribute'u "amount" olan input alanları
                  </Text>
                </div>

                <div>
                  <Code>.button-primary, .button-secondary</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Birden fazla selector (virgülle ayırın)
                  </Text>
                </div>

                <div>
                  <Code>form button[type="submit"]</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Form içindeki submit butonları
                  </Text>
                </div>
              </Stack>

              <Divider my="md" />

              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="xs" weight={500} mb={4}>
                  💡 Selector Nasıl Bulunur?
                </Text>
                <Stack spacing={4}>
                  <Text size="xs">
                    1. Web sitenizde sağ tık → "İncele" (Inspect)
                  </Text>
                  <Text size="xs">
                    2. İzlemek istediğiniz elemente tıklayın
                  </Text>
                  <Text size="xs">
                    3. HTML'de class, id veya attribute'u kopyalayın
                  </Text>
                  <Text size="xs">
                    4. Yukarıdaki "Test Kodu" ile doğrulayın
                  </Text>
                </Stack>
              </Alert>

              <Divider my="md" />

              <Alert icon={<IconCurrencyDollar size={16} />} color="green" variant="light">
                <Text size="xs" weight={500} mb={4}>
                  💰 Miktar Takibi Nasıl Çalışır?
                </Text>
                <Stack spacing={4}>
                  <Text size="xs">
                    <strong>Örnek Senaryo:</strong> Kullanıcı 500 TL yatırmak istiyor
                  </Text>
                  <Text size="xs">
                    1. Miktar input alanına 500 yazar
                  </Text>
                  <Text size="xs">
                    2. "Yatır" butonuna tıklar
                  </Text>
                  <Text size="xs">
                    3. Sistem otomatik olarak miktarı yakalar
                  </Text>
                  <Text size="xs">
                    4. Event parametrelerine <Code>amount: 500</Code> eklenir
                  </Text>
                  <Text size="xs">
                    5. Backend'e gönderilen event: <Code>{`{eventName: "deposit_successful", amount: 500, currency: "TRY"}`}</Code>
                  </Text>
                </Stack>
              </Alert>
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}

export default DomConfigBuilder;