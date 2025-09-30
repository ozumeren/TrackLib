import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Title, Card, Loader, Alert, Group, Text, Stack, JsonInput, Button, Notification } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';

function AdminCustomerDetailPage() {
  const { token } = useAuth();
  const { id } = useParams(); // URL'den müşteri ID'sini al
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [domConfig, setDomConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!token || !id) return;
      try {
        const response = await axios.get(`/api/admin/customers/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setCustomer(response.data);
        setDomConfig(JSON.stringify(response.data.domConfig, null, 2) || '{}');
      } catch (err) {
        setError('Müşteri detayları çekilemedi.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerDetails();
  }, [token, id]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      const parsedConfig = JSON.parse(domConfig);
      await axios.put(`/api/admin/customers/${id}/domconfig`, { domConfig: parsedConfig }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Yapılandırma başarıyla kaydedildi.');
    } catch (err) {
      setError(err.response?.data?.error || 'Yapılandırma kaydedilirken bir hata oluştu. JSON formatını kontrol edin.');
    }
  };

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">{error}</Alert>;

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Title order={2} mb="lg">Müşteri Yapılandırması: {customer?.name}</Title>
      {success && <Notification icon={<IconCheck size={18} />} color="teal" title="Başarılı!" onClose={() => setSuccess(null)}>{success}</Notification>}

      <Stack mt="md">
        <JsonInput
          label="DOM Gözlemci Reçetesi (domConfig)"
          placeholder='{ "rules": [{ "eventName": "...", "selector": "..." }] }'
          validationError="Geçersiz JSON"
          formatOnBlur
          autosize
          minRows={10}
          value={domConfig}
          onChange={setDomConfig}
        />
        <Group position="apart" mt="md">
            <Button variant="default" onClick={() => navigate('/admin/customers')}>Geri</Button>
            <Button onClick={handleSave}>Kaydet</Button>
        </Group>
      </Stack>
    </Card>
  );
}

export default AdminCustomerDetailPage;
