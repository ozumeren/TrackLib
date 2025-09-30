import { useState, useEffect } from 'react';
import axios from 'axios';
import { Title, Table, Card, Loader, Alert, Group, Text, Button, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import SegmentForm from '../components/SegmentForm';
import { useAuth } from '../AuthContext'; // 1. Adım: AuthContext'i import et

function Segments() {
  const { token } = useAuth(); // 2. Adım: Giriş yapmış kullanıcının jetonunu al
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);

  const fetchSegments = async () => {
    // 3. Adım: Jeton yoksa istek göndermeyi deneme
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // 4. Adım: Sabit API anahtarı yerine dinamik jetonu kullan
      const response = await axios.get('/api/segments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSegments(response.data);
      setError(null);
    } catch (err) {
      setError('Segment verileri çekilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, [token]); // 5. Adım: Jeton değiştiğinde veriyi yeniden çek

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
  if (error) return <Alert icon={<IconAlertCircle size="1rem" />} title="Hata!" color="red">{error}</Alert>;

  const rows = segments.map((segment) => (
    <tr key={segment.id}>
      <td>{segment.name}</td>
      <td>{segment.description}</td>
      <td>{segment.playerCount}</td>
      <td>
        <Group spacing="xs">
            <ActionIcon onClick={() => { setEditingSegment(segment); setIsModalOpen(true); }}>
                <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon color="red" onClick={() => handleDeleteSegment(segment.id)}>
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
        onClose={() => setIsModalOpen(false)}
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
