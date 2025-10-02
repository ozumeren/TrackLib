import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Stack, Title, Card, TextInput, Button, Group, Loader, Alert, Notification, Text, CopyButton, Divider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconRefresh } from '@tabler/icons-react';

function SettingsPage() {
    const { token, user } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    const form = useForm({
        initialValues: {
            telegramBotToken: '',
            metaPixelId: '',
            metaAccessToken: '',
            googleAdsId: '',
            googleApiSecret: '',
        },
    });

    const fetchSettings = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await axios.get('/api/customers/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSettings(response.data);
            form.setValues({
                telegramBotToken: response.data.telegramBotToken || '',
                metaPixelId: response.data.metaPixelId || '',
                metaAccessToken: response.data.metaAccessToken || '',
                googleAdsId: response.data.googleAdsId || '',
                googleApiSecret: response.data.googleApiSecret || '',
            });
        } catch (err) {
            setError('Ayarlar alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [token]);

    const handleSubmit = async (values) => {
        setError(null);
        setSuccess(null);
        try {
            await axios.put('/api/customers/settings', values, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSuccess('Ayarlar başarıyla güncellendi.');
        } catch (err) {
            setError(err.response?.data?.error || 'Ayarlar güncellenemedi.');
        }
    };
    
    const handleRenewApiKey = async () => {
        // ... (API anahtarı yenileme fonksiyonu aynı kalıyor)
    };

    if (loading) return <Group position="center"><Loader /></Group>;
    if (error) return <Alert color="red" mb="md">{error}</Alert>;

    return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
            <Title order={2} mb="lg">Müşteri Ayarları</Title>
            {success && <Notification icon={<IconCheck size={18} />} color="teal" title="Başarılı!" onClose={() => setSuccess(null)}>{success}</Notification>}

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Group>
                        <TextInput label="API Anahtarınız" value={settings?.apiKey || ''} readOnly style={{ flex: 1 }} />
                        <CopyButton value={settings?.apiKey || ''}>
                            {({ copied, copy }) => (
                                <Button color={copied ? 'teal' : 'blue'} onClick={copy} mt={25}>
                                    {copied ? 'Kopyalandı' : 'Kopyala'}
                                </Button>
                            )}
                        </CopyButton>
                        {user?.role === 'OWNER' && (
                           <Button color="orange" onClick={handleRenewApiKey} mt={25} leftSection={<IconRefresh size={16} />}>Yenile</Button>
                        )}
                    </Group>
                    
                    <Divider my="lg" label="Entegrasyonlar" labelPosition="center" />

                    <TextInput label="Telegram Bot Token" {...form.getInputProps('telegramBotToken')} />

                    <Title order={4} mt="md">Meta (Facebook) Ayarları</Title>
                    <TextInput label="Meta Pixel ID" {...form.getInputProps('metaPixelId')} />
                    <TextInput label="Meta Conversions API Access Token" {...form.getInputProps('metaAccessToken')} />
                    
                    <Title order={4} mt="md">Google Ads Ayarları</Title>
                    <TextInput label="Google Ads ID (AW-...)" {...form.getInputProps('googleAdsId')} />
                    <TextInput label="Google Measurement Protocol API Secret" {...form.getInputProps('googleApiSecret')} />

                    <Button type="submit" mt="xl" style={{ alignSelf: 'flex-start' }}>Tüm Ayarları Kaydet</Button>
                </Stack>
            </form>
        </Card>
    );
}

export default SettingsPage;

