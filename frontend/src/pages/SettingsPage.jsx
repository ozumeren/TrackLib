import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Stack, Title, Card, TextInput, Button, Group, Loader, Alert, Notification, Text, CopyButton } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconRefresh } from '@tabler/icons-react';

function SettingsPage() {
    const { token } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isRenewing, setIsRenewing] = useState(false);
    const form = useForm({
        initialValues: { telegramBotToken: '' },
    });

    const fetchSettings = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await axios.get('/api/customers/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSettings(response.data);
            form.setValues({ telegramBotToken: response.data.telegramBotToken || '' });
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
        const confirmation = confirm(
            'UYARI: API anahtarınızı yenilemek, mevcut entegrasyonunuzun çalışmamasına neden olacaktır. Sitenizdeki script etiketini yeni anahtarla güncellemeniz gerekecektir. Devam etmek istediğinizden emin misiniz?'
        );

        if (confirmation) {
            setIsRenewing(true);
            setError(null);
            setSuccess(null);
            try {
                const response = await axios.put('/api/customers/settings/renew-api-key', {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                setSettings(prev => ({ ...prev, apiKey: response.data.newApiKey }));
                setSuccess('API anahtarınız başarıyla yenilendi! Lütfen yeni anahtarı sitenize ekleyin.');
            } catch (err) {
                setError(err.response?.data?.error || 'API anahtarı yenilenemedi.');
            } finally {
                setIsRenewing(false);
            }
        }
    };

    if (loading) return <Group position="center"><Loader /></Group>;
    if (error) return <Alert color="red" mb="md">{error}</Alert>;

    return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
            <Title order={2} mb="lg">Müşteri Ayarları</Title>
            {success && <Notification icon={<IconCheck size={18} />} color="teal" onClose={() => setSuccess(null)}>{success}</Notification>}

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
                    <Button 
                        color="orange" 
                        onClick={handleRenewApiKey} 
                        mt={25} 
                        leftIcon={<IconRefresh size={16} />}
                        loading={isRenewing}
                    >
                        Yenile
                    </Button>
                </Group>
                
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <TextInput label="Telegram Bot Token" {...form.getInputProps('telegramBotToken')} />
                        <Button type="submit" mt="md" style={{ alignSelf: 'flex-start' }}>Kaydet</Button>
                    </Stack>
                </form>
            </Stack>
        </Card>
    );
}

export default SettingsPage;


