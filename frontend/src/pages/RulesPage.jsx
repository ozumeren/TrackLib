import { useState, useEffect } from 'react';
import axios from 'axios';
import { Title, Card, Loader, Alert, Group, Text, Button, ActionIcon, Table, Badge } from '@mantine/core';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import RuleForm from '../components/RuleForm';
import { useAuth } from '../AuthContext';

function RulesPage() {
  const { token } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  const fetchRules = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/rules', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRules(response.data);
    } catch (err) {
      setError('Kurallar çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleSaveRule = async (values, ruleId) => {
    try {
      if (ruleId) {
        await axios.put(`/api/rules/${ruleId}`, values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/rules', values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setIsFormModalOpen(false);
      setSelectedRule(null);
      fetchRules();
    } catch (err) {
      alert('Kural kaydedilirken bir hata oluştu.');
    }
  };
  
  const handleDeleteRule = async (ruleId) => {
    if (confirm('Bu kuralı ve bağlı tüm varyantlarını silmek istediğinizden emin misiniz?')) {
        try {
            await axios.delete(`/api/rules/${ruleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchRules();
        } catch (err) {
            alert('Kural silinirken bir hata oluştu.');
        }
    }
  };

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">{error}</Alert>;

  const rows = rules.map((rule) => (
    <tr key={rule.id}>
      <td>{rule.name}</td>
      <td>
        <Badge color={rule.isActive ? 'green' : 'gray'}>
          {rule.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      </td>
      <td>{rule.triggerType}</td>
      <td>{rule.variantsCount || 0}</td>
      <td>
        <Group spacing="xs">
            <ActionIcon title="Düzenle" onClick={() => { setSelectedRule(rule); setIsFormModalOpen(true); }}>
                <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon color="red" title="Sil" onClick={() => handleDeleteRule(rule.id)}>
                <IconTrash size={16} />
            </ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  return (
    <>
      <RuleForm 
        isOpen={isFormModalOpen}
        onClose={() => { setIsFormModalOpen(false); setSelectedRule(null); }}
        onSave={handleSaveRule}
        rule={selectedRule}
      />

      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group position="apart" mb="lg">
          <Title order={2}>Otomasyon Kuralları</Title>
          <Button onClick={() => { setSelectedRule(null); setIsFormModalOpen(true); }}>
            Yeni Kural Oluştur
          </Button>
        </Group>
        
        {rules.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Kural Adı</th>
                <th>Durum</th>
                <th>Tetikleyici Türü</th>
                <th>Varyant Sayısı</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        ) : (
          <Text>Henüz oluşturulmuş bir otomasyon kuralı yok.</Text>
        )}
      </Card>
    </>
  );
}

export default RulesPage;

