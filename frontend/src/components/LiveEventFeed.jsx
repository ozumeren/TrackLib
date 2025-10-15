// frontend/src/components/LiveEventFeed.jsx
import { useState, useEffect, useRef } from 'react';
import { 
  Card, Stack, Group, Text, Badge, ScrollArea, 
  ThemeIcon, Box, Timeline, Loader, Center,
  ActionIcon, Tooltip
} from '@mantine/core';
import { 
  IconActivity, IconRefresh, IconPlayerPause, 
  IconPlayerPlay, IconExternalLink 
} from '@tabler/icons-react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

function LiveEventFeed({ maxHeight = 500 }) {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const intervalRef = useRef(null);
  const lastTimestampRef = useRef(null);

  const fetchEvents = async (isInitial = false) => {
    if (!token || isPaused) return;

    try {
      const params = {};
      if (!isInitial && lastTimestampRef.current) {
        params.after = lastTimestampRef.current;
      }

      const response = await axios.get('/api/analytics/live-events', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { ...params, limit: 20 }
      });

      const newEvents = response.data.events;

      if (newEvents.length > 0) {
        setEvents(prev => {
          // Yeni eventleri ekle ve duplicate'leri kaldır
          const combined = [...newEvents, ...prev];
          const unique = Array.from(
            new Map(combined.map(e => [e.id, e])).values()
          );
          // Son 50 eventi tut
          return unique.slice(0, 50);
        });

        // En yeni event'in timestamp'ini kaydet
        lastTimestampRef.current = newEvents[0].createdAt;

        // İlk yükleme değilse yeni event sayısını artır
        if (!isInitial) {
          setNewEventCount(prev => prev + newEvents.length);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Live events fetch error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // İlk yükleme
    fetchEvents(true);

    // 3 saniyede bir polling
    intervalRef.current = setInterval(() => {
      fetchEvents(false);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, isPaused]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    setNewEventCount(0);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) return 'Az önce';
    if (diffSec < 60) return `${diffSec} saniye önce`;
    if (diffMin < 60) return `${diffMin} dakika önce`;
    
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEventColor = (color) => {
    const colorMap = {
      green: 'teal',
      blue: 'blue',
      red: 'red',
      yellow: 'yellow',
      violet: 'grape',
      gray: 'gray',
      teal: 'cyan'
    };
    return colorMap[color] || 'blue';
  };

  if (loading && events.length === 0) {
    return (
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Center py="xl">
          <Stack align="center" spacing="md">
            <Loader size="md" />
            <Text size="sm" color="dimmed">Canlı eventler yükleniyor...</Text>
          </Stack>
        </Center>
      </Card>
    );
  }

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group position="apart" mb="md">
        <Group spacing="sm">
          <ThemeIcon 
            size="lg" 
            radius="md" 
            variant="light" 
            color={isPaused ? 'gray' : 'green'}
          >
            <IconActivity size={20} />
          </ThemeIcon>
          <div>
            <Text size="lg" weight={600}>Canlı Event Akışı</Text>
            <Group spacing={8}>
              <Badge 
                size="xs" 
                variant="dot" 
                color={isPaused ? 'gray' : 'green'}
              >
                {isPaused ? 'Durduruldu' : 'Canlı'}
              </Badge>
              {!isPaused && newEventCount > 0 && (
                <Badge size="xs" color="blue">
                  +{newEventCount} yeni
                </Badge>
              )}
            </Group>
          </div>
        </Group>

        <Group spacing="xs">
          <Tooltip label={isPaused ? 'Devam Et' : 'Duraklat'}>
            <ActionIcon 
              size="lg" 
              variant="light" 
              color={isPaused ? 'green' : 'yellow'}
              onClick={togglePause}
            >
              {isPaused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Yenile">
            <ActionIcon 
              size="lg" 
              variant="light" 
              color="blue"
              onClick={() => fetchEvents(true)}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <ScrollArea style={{ height: maxHeight }}>
        {events.length === 0 ? (
          <Center py="xl">
            <Stack align="center" spacing="xs">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconActivity size={24} />
              </ThemeIcon>
              <Text size="sm" color="dimmed">Henüz event yok</Text>
            </Stack>
          </Center>
        ) : (
          <Timeline 
            bulletSize={32} 
            lineWidth={2}
            styles={{
              itemBullet: { borderWidth: 2 }
            }}
          >
            {events.map((event, index) => (
              <Timeline.Item
                key={event.id}
                bullet={
                  <Text size="lg">{event.metadata.icon}</Text>
                }
                color={getEventColor(event.metadata.color)}
                style={{
                  animation: index < newEventCount && !isPaused 
                    ? 'slideIn 0.3s ease-out' 
                    : 'none'
                }}
              >
                <Box mb="sm">
                  <Group position="apart" mb={4}>
                    <Group spacing="xs">
                      <Badge 
                        size="sm" 
                        variant="light" 
                        color={getEventColor(event.metadata.color)}
                      >
                        {event.metadata.label}
                      </Badge>
                      {event.metadata.value && (
                        <Badge size="sm" variant="filled" color="dark">
                          {event.metadata.value}
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" color="dimmed">
                      {formatTime(event.createdAt)}
                    </Text>
                  </Group>

                  <Group spacing="sm">
                    {event.playerId !== 'Anonymous' && (
                      <Text 
                        size="sm" 
                        component={RouterLink}
                        to={`/player/${event.playerId}`}
                        style={{ 
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        sx={(theme) => ({
                          color: theme.colors.blue[6],
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        })}
                      >
                        👤 {event.playerId}
                        <IconExternalLink size={12} />
                      </Text>
                    )}
                  </Group>

                  {event.parameters && Object.keys(event.parameters).length > 0 && (
                    <Text size="xs" color="dimmed" mt={4}>
                      {Object.entries(event.parameters)
                        .filter(([key]) => !['amount', 'currency'].includes(key))
                        .slice(0, 2)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' • ')}
                    </Text>
                  )}
                </Box>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </ScrollArea>

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </Card>
  );
}

export default LiveEventFeed;