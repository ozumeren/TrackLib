import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Stack, Title, Card, TextInput, PasswordInput, Button, Group, Loader, Alert, Notification } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck } from '@tabler/icons-react';

function AccountPage() {
    const { token, user, login } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const form = useForm({
        initialValues: { name: '', email: '', password: '' },
        validate: {
            email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Geçersiz e-posta adresi'),
        }
    });

    useEffect(() => {
        if (user) {
            form.setValues({ name: user.name, email: user.email, password: '' });
            setLoading(false);
        }
    }, [user]);

    const handleSubmit = async (values) => {
        setError(null);
        setSuccess(null);
        const payload = { ...values };
        if (!payload.password) delete payload.password;

        try {
            await axios.put('/api/users/me', payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSuccess('Profiliniz başarıyla güncellendi.');
            // Update user info in context if name/email changed
            const updatedUser = { ...user, name: values.name, email: values.email };
            login({ token, ...updatedUser }); // Re-login with updated info
            form.setFieldValue('password', '');
        } catch (err) {
            setError(err.response?.data?.error || 'Profil güncellenemedi.');
        }
    };

    if (loading) return <Group position="center"><Loader /></Group>;

    return (
        <Card shadow="sm" p="lg" radius="md" withBorder>
            <Title order={2} mb="lg">Hesabım</Title>
            {error && <Alert color="red" mb="md">{error}</Alert>}
            {success && <Notification icon={<IconCheck size={18} />} color="teal" onClose={() => setSuccess(null)}>{success}</Notification>}

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput label="Adınız" {...form.getInputProps('name')} />
                    <TextInput label="E-posta Adresiniz" {...form.getInputProps('email')} />
                    <PasswordInput label="Yeni Şifre" placeholder="Değiştirmek istemiyorsanız boş bırakın" {...form.getInputProps('password')} />
                    <Button type="submit" mt="md">Güncelle</Button>
                </Stack>
            </form>
        </Card>
    );
}

export default AccountPage;

