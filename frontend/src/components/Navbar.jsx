import { Box, Group, Button, Title, Text, Menu } from '@mantine/core';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { IconChevronDown } from '@tabler/icons-react';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box component="nav" p="md" style={{ backgroundColor: '#228be6', color: 'white' }}>
      <Group position="apart">
        <Title order={3} component={RouterLink} to="/" style={{ color: 'white', textDecoration: 'none' }}>
          TrackLib
        </Title>
        <Group>
            {user ? (
                <>
                    <Button component={RouterLink} to="/" variant="outline" color="white">Dashboard</Button>
                    <Button component={RouterLink} to="/segments" variant="outline" color="white">Segmentler</Button>
                    <Button component={RouterLink} to="/rules" variant="outline" color="white">Kurallar</Button>
		    <Button component={RouterLink} to="/abandoned-deposits" variant="outline" color="white">Terk Edilmiş Yatırımlar</Button>
                    {/* YENİ: Sadece Admin'lerin göreceği link */}
                    {user.role === 'ADMIN' && (
                        <Button component={RouterLink} to="/admin/customers" variant="light" color="yellow">
                            Yönetici Paneli
                        </Button>
                    )}
                    
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <Button variant="outline" color="white">
                                <Group spacing="xs">
                                    <Text>Hoş geldin, {user.name}</Text>
                                    <IconChevronDown size={14} />
                                </Group>
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item component={RouterLink} to="/account">Hesabım</Menu.Item>
                            <Menu.Item component={RouterLink} to="/settings">Ayarlar</Menu.Item>
                            <Menu.Divider />
                            <Menu.Item color="red" onClick={handleLogout}>Çıkış Yap</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </>
            ) : (
                <>
                    <Button component={RouterLink} to="/login" variant="outline" color="white">Giriş Yap</Button>
                    <Button component={RouterLink} to="/register" variant="light">Kayıt Ol</Button>
                </>
            )}
        </Group>
      </Group>
    </Box>
  );
}

export default Navbar;

