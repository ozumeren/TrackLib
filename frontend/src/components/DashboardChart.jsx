import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';

function DashboardChart({ data }) {
  if (!data || data.length === 0) {
    return <Text>Grafik için yeterli veri yok.</Text>;
  }

  // Tarih formatını daha okunabilir yapalım (örn: 25 Eyl)
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
  }));

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder style={{ height: 400 }}>
      <Title order={4} mb="md">Son 7 Günlük Aktivite</Title>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="logins" name="Girişler" stroke="#8884d8" />
          <Line type="monotone" dataKey="registrations" name="Kayıtlar" stroke="#82ca9d" />
          <Line type="monotone" dataKey="deposits" name="Yatırımlar" stroke="#ffc658" />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}

export default DashboardChart;
