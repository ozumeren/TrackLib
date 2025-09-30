import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { Title, Card, Loader, Alert, Group, Text, Table, Anchor } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';

function AdminCustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!token) return;
      try {
        const response = await axios.get('/api/admin/customers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setCustomers(response.data);
      } catch (err) {
        setError('Müşteri listesi çekilirken bir hata oluştu. Bu sayfayı görme yetkiniz olmayabilir.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [token]);

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">{error}</Alert>;

  const rows = customers.map((customer) => (
    <tr key={customer.id}>
      <td>{customer.id}</td>
      <td>
        {/* Müşteri detay sayfasına link */}
        <Anchor component={RouterLink} to={`/admin/customer/${customer.id}`}>
            {customer.name}
        </Anchor>
      </td>
      <td>{customer.apiKey}</td>
    </tr>
  ));

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Title order={2} mb="lg">Yönetici Paneli - Müşteriler</Title>
      {customers.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Müşteri Adı</th>
              <th>API Anahtarı</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      ) : (
        <Text>Henüz kayıtlı müşteri yok.</Text>
      )}
    </Card>
  );
}

export default AdminCustomersPage;
