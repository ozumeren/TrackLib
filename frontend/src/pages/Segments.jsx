import { useState, useEffect } from 'react';
import axios from 'axios';
import { Title, Card, Loader, Alert, Group, Text, Button, ActionIcon, Table } from '@mantine/core';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import SegmentForm from '../components/SegmentForm';
import { useAuth } from '../AuthContext';

function Segments() {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);

  const fetchSegments = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null); // Hata durumunu sıfırla
      const response = await axios.get('/api/segments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSegments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Segment verileri çekilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [token]);

  const handleSaveSegment = async (values, segmentId) => {
    try {
      if (segmentId) { // Düzenleme
        await axios.put(`/api/segments/${segmentId}`, values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else { // Oluşturma
        await axios.post('/api/segments', values, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setIsModalOpen(false);
      setEditingSegment(null);
      fetchSegments(); // Listeyi yenile
    } catch (err) {
      alert('Segment kaydedilirken bir hata oluştu.');
    }
  };
  
  const handleDeleteSegment = async (segmentId) => {
    if (confirm('Bu segmenti silmek istediğinizden emin misiniz?')) {
        try {
            await axios.delete(`/api/segments/${segmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchSegments(); // Listeyi yenile
        } catch (err) {
            alert('Segment silinirken bir hata oluştu.');
        }
    }
  };

  if (loading) return <Group position="center"><Loader /></Group>;
  if (error) return <Alert icon={<IconAlertCircle size={16} />} title="Hata!" color="red">{error}</Alert>;

  const rows = segments.map((segment) => (
    <tr key={segment.id}>
      <td>{segment.name}</td>
      <td>{segment.description}</td>
      <td>{segment.playerCount}</td>
      <td>
        <Group spacing="xs">
            <ActionIcon title="Düzenle" onClick={() => { setEditingSegment(segment); setIsModalOpen(true); }}>
                <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon color="red" title="Sil" onClick={() => handleDeleteSegment(segment.id)}>
                <IconTrash size={16} />
            </ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  return (
    <>
      <SegmentForm 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSegment(null); }}
        onSave={handleSaveSegment}
        segment={editingSegment}
      />

      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group position="apart" mb="lg">
          <Title order={2}>Oyuncu Segmentleri</Title>
          <Button onClick={() => { setEditingSegment(null); setIsModalOpen(true); }}>
            Yeni Segment Oluştur
          </Button>
        </Group>
        
        {segments.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Segment Adı</th>
                <th>Açıklama</th>
                <th>Oyuncu Sayısı</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </Table>
        ) : (
          <Text>Henüz oluşturulmuş bir segment yok.</Text>
        )}
      </Card>
    </>
  );
}

export default Segments;

