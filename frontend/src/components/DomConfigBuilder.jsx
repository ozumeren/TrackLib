// frontend/src/components/DomConfigBuilder.jsx - Kolay DomConfig Oluşturucu
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
  IconUpload, IconEye
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

// Şablon örnekleri
const templates = {
  deposit: {
    name: 'Para Yatırma Tracking',
    rules: [
      {
        eventName: 'deposit_page_view',
        selector: '.deposit-button, #deposit-btn, button[data-action="deposit"]',
        trigger: 'click',
        parameters: { page: 'deposit' }
      }
    ]
  },
  withdrawal: {
    name: 'Para Çekme Tracking',
    rules: [
      {
        eventName: 'withdrawal_page_view',
        selector: '.withdrawal-button, #withdraw-btn',
        trigger: 'click',
        parameters: { page: 'withdrawal' }
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
    name: 'Komple iGaming Setup',
    rules: [
      {
        eventName: 'deposit_page_view',
        selector: '.deposit-button',
        trigger: 'click',
        parameters: { page: 'deposit' }
      },
      {
        eventName: 'withdrawal_page_view',
        selector: '.withdrawal-button',
        trigger: 'click',
        parameters: { page: 'withdrawal' }
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
      parameters: {}
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

  // Test kodu oluştur
  const generateTestCode = () => {
    return `// Test Script - Browser Console'da Çalıştırın
// Bu kod, yapılandırdığınız selector'ların sayfada bulunup bulunmadığını test eder

console.log('🧪 DomConfig Test Başlatılıyor...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const rules = ${JSON.stringify(rules, null, 2)};

rules.forEach((rule, index) => {
  console.log(\`\\n📌 Kural #\${index + 1}: \${rule.eventName}\`);
  console.log(\`   Selector: \${rule.selector}\`);
  
  try {
    const elements = document.querySelectorAll(rule.selector);
    
    if (elements.length > 0) {
      console.log(\`   ✅ BULUNDU: \${elements.length} element\`);
      elements.forEach((el, i) => {
        console.log(\`      [\${i}]:\`, el);
      });
    } else {
      console.log(\`   ❌ BULUNAMADI: Bu selector ile eşleşen element yok\`);
      console.log(\`   💡 İpucu: Sayfayı inspect edin ve doğru selector'ı bulun\`);
    }
  } catch (error) {
    console.log(\`   ⚠️  HATA: Geçersiz selector - \${error.message}\`);
  }
});

console.log('\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Test tamamlandı!');
`;
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Tabs value={activeTab} onTabChange={setActiveTab}>
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
                        {copied ? 'Test Kodu Kopyalandı!' : 'Test Kodu'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={addRule}
                  size="sm"
                >
                  Yeni Kural
                </Button>
              </Group>
            </Group>

            {showPreview && (
              <Paper p="md" withBorder>
                <Group position="apart" mb="xs">
                  <Text size="sm" weight={500}>JSON Önizleme</Text>
                  <CopyButton value={JSON.stringify(generatedConfig, null, 2)}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        onClick={copy}
                      >
                        {copied ? 'Kopyalandı!' : 'Kopyala'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
                <Code block>{JSON.stringify(generatedConfig, null, 2)}</Code>
              </Paper>
            )}

            {rules.length === 0 ? (
              <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                <Text size="sm" weight={500} mb={4}>
                  Henüz kural eklenmedi
                </Text>
                <Text size="xs" color="dimmed">
                  "Yeni Kural" butonuna tıklayarak tracking kuralı ekleyin veya hazır şablonları kullanın.
                </Text>
              </Alert>
            ) : (
              <Stack spacing="md">
                {rules.map((rule, index) => (
                  <Paper key={index} p="md" radius="md" withBorder>
                    <Group position="apart" mb="md">
                      <Badge size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                        Kural #{index + 1}
                      </Badge>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeRule(index)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>

                    <Stack spacing="md">
                      {/* Event Name */}
                      <Select
                        label="Event Adı"
                        description="Hangi event gönderilsin?"
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
                            onClick={() => updateRule(index, 'selector', '.game-tile, .game-card')}
                          >
                            🎮 Oyun kartı
                          </Button>
                          <Button
                            size="xs"
                            variant="subtle"
                            compact
                            onClick={() => updateRule(index, 'selector', '#registration-form, .signup-form')}
                          >
                            📝 Kayıt formu
                          </Button>
                        </Group>
                      </Stack>

                      {/* Trigger */}
                      <Select
                        label="Tetikleme Tipi"
                        description="Ne zaman event gönderilsin?"
                        data={triggerTypes}
                        value={rule.trigger}
                        onChange={(val) => updateRule(index, 'trigger', val)}
                        required
                      />

                      {/* Parameters */}
                      <Accordion variant="separated">
                        <Accordion.Item value="params">
                          <Accordion.Control icon={<IconInfoCircle size={16} />}>
                            Ek Parametreler (Opsiyonel)
                          </Accordion.Control>
                          <Accordion.Panel>
                            <JsonInput
                              placeholder='{"key": "value"}'
                              value={JSON.stringify(rule.parameters || {}, null, 2)}
                              onChange={(val) => updateRule(index, 'parameters', val)}
                              minRows={3}
                              autosize
                              formatOnBlur
                            />
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>

                      {/* Örnek Kullanım */}
                      <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
                        <Text size="xs" weight={500} mb={4}>HTML Örneği:</Text>
                        <Code block style={{ fontSize: 10 }}>
                          {`<button class="${rule.selector.replace('.', '')}">Tıkla</button>`}
                        </Code>
                      </Alert>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        {/* JSON Editör */}
        <Tabs.Panel value="code" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Manuel JSON düzenleme yapabilirsiniz. Değişiklikler otomatik kaydedilir.
              </Text>
            </Alert>

            <JsonInput
              label="DomConfig JSON"
              value={JSON.stringify(generatedConfig, null, 2)}
              onChange={(val) => importFromJson(val)}
              minRows={15}
              autosize
              formatOnBlur
            />
          </Stack>
        </Tabs.Panel>

        {/* Şablonlar */}
        <Tabs.Panel value="templates" pt="md">
          <Stack spacing="md">
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                Hazır şablonlardan birini seçerek hızlıca başlayın. Şablonu yükledikten sonra özelleştirebilirsiniz.
              </Text>
            </Alert>

            <Stack spacing="md">
              {Object.entries(templates).map(([key, template]) => (
                <Paper key={key} p="md" radius="md" withBorder>
                  <Group position="apart">
                    <div>
                      <Text weight={600} mb={4}>{template.name}</Text>
                      <Text size="xs" color="dimmed">
                        {template.rules.length} kural içerir
                      </Text>
                    </div>
                    <Button
                      variant="light"
                      leftSection={<IconDownload size={16} />}
                      onClick={() => loadTemplate(key)}
                    >
                      Yükle
                    </Button>
                  </Group>
                  
                  <Divider my="sm" />
                  
                  <Stack spacing={4}>
                    {template.rules.map((rule, idx) => (
                      <Group key={idx} spacing="xs">
                        <Badge size="sm" variant="dot">
                          {rule.eventName}
                        </Badge>
                        <Text size="xs" color="dimmed">
                          {rule.selector}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Divider label="CSS Selector Rehberi" labelPosition="center" />

            {/* CSS Selector Yardımı */}
            <Card shadow="sm" padding="lg" radius="md" withBorder bg="gray.0">
              <Text size="md" weight={600} mb="md">📚 CSS Selector Örnekleri</Text>
              
              <Stack spacing="md">
                <div>
                  <Code>button</Code>
                  <Text size="xs" color="dimmed" mt={4}>
                    Tüm button elementleri
                  </Text>
                </div>

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
                    3. HTML'de class veya id'yi kopyalayın
                  </Text>
                  <Text size="xs">
                    4. Yukarıdaki "Test Kodu" ile doğrulayın
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