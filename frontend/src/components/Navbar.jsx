import { 
  AppShell, Group, Button, Stack, Menu, Text, Divider, 
  ThemeIcon, Badge, UnstyledButton, Box, Avatar
} from '@mantine/core';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  IconReportMoney, IconChevronDown, IconDashboard, IconChartPie,
  IconTargetArrow, IconSettings, IconUser, IconLogout, IconUserShield,
  IconChartBar, IconShieldCheck
} from '@tabler/icons-react';

function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainLinks = [
    { 
      icon: IconDashboard, 
      label: 'Dashboard', 
      to: '/',
      description: 'Genel bakış'
    },
    { 
      icon: IconChartPie, 
      label: 'Segmentler', 
      to: '/segments',
      description: 'Oyuncu grupları'
    },
    { 
      icon: IconTargetArrow, 
      label: 'Kurallar', 
      to: '/rules',
      description: 'Otomasyon'
    },
    {
      icon: IconReportMoney,
      label: 'Terk Edilmiş',
      to: '/abandoned-deposits',
      description: 'Kayıp fırsatlar'
    },
  ];

  const fraudLinks = [
    {
      icon: IconShieldCheck,
      label: 'Fraud Uyarıları',
      to: '/fraud/alerts',
      description: 'Şüpheli aktiviteler'
    },
    {
      icon: IconShieldCheck,
      label: 'Risk Profilleri',
      to: '/fraud/risk-profiles',
      description: 'Oyuncu risk skorları'
    }
  ];

  return (
    <AppShell.Navbar p="md">
      <Stack justify="space-between" style={{ height: '100%' }}>
        {/* Logo Section */}
        <Box>
          <Group spacing="xs" mb="xl" px="sm">
            <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconChartBar size={20} />
            </ThemeIcon>
            <div>
              <Text size="lg" weight={700}>TrackLib</Text>
              <Badge size="xs" variant="dot" color="green">Live</Badge>
            </div>
          </Group>

          <Divider mb="md" />

          {/* Navigation Links */}
          <Stack spacing={4}>
            {mainLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              
              return (
                <UnstyledButton
                  key={link.label}
                  component={RouterLink}
                  to={link.to}
                  sx={(theme) => ({
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    color: isActive ? theme.colors.blue[6] : theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
                    backgroundColor: isActive 
                      ? theme.colorScheme === 'dark' 
                        ? theme.colors.dark[6] 
                        : theme.colors.blue[0]
                      : 'transparent',
                    
                    '&:hover': {
                      backgroundColor: isActive
                        ? theme.colorScheme === 'dark'
                          ? theme.colors.dark[6]
                          : theme.colors.blue[0]
                        : theme.colorScheme === 'dark'
                        ? theme.colors.dark[7]
                        : theme.colors.gray[0],
                    },

                    transition: 'all 0.15s ease',
                  })}
                >
                  <Group>
                    <ThemeIcon 
                      size="md" 
                      radius="md" 
                      variant={isActive ? 'filled' : 'light'}
                      color={isActive ? 'blue' : 'gray'}
                    >
                      <Icon size={18} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" weight={isActive ? 600 : 500}>
                        {link.label}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {link.description}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              );
            })}

            {/* Fraud Detection Section */}
            <Divider my="sm" label="Fraud Detection" labelPosition="center" />
            {fraudLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;

              return (
                <UnstyledButton
                  key={link.label}
                  component={RouterLink}
                  to={link.to}
                  sx={(theme) => ({
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    color: isActive ? theme.colors.red[6] : theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
                    backgroundColor: isActive
                      ? theme.colorScheme === 'dark'
                        ? theme.colors.dark[6]
                        : theme.colors.red[0]
                      : 'transparent',

                    '&:hover': {
                      backgroundColor: isActive
                        ? theme.colorScheme === 'dark'
                          ? theme.colors.dark[6]
                          : theme.colors.red[0]
                        : theme.colorScheme === 'dark'
                        ? theme.colors.dark[7]
                        : theme.colors.gray[0],
                    },

                    transition: 'all 0.15s ease',
                  })}
                >
                  <Group>
                    <ThemeIcon
                      size="md"
                      radius="md"
                      variant={isActive ? 'filled' : 'light'}
                      color={isActive ? 'red' : 'gray'}
                    >
                      <Icon size={18} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" weight={isActive ? 600 : 500}>
                        {link.label}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {link.description}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              );
            })}

            {/* Admin Panel Link */}
            {user?.role === 'ADMIN' && (
              <>
                <Divider my="sm" />
                <UnstyledButton
                  component={RouterLink}
                  to="/admin/customers"
                  sx={(theme) => ({
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.yellow[0],
                    
                    '&:hover': {
                      backgroundColor: theme.colors.yellow[1],
                    },
                  })}
                >
                  <Group>
                    <ThemeIcon size="md" radius="md" color="yellow">
                      <IconUserShield size={18} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" weight={600} color="yellow.9">
                        Yönetici Paneli
                      </Text>
                      <Text size="xs" color="yellow.7">
                        Tüm müşteriler
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              </>
            )}
          </Stack>
        </Box>

        {/* User Menu */}
        <Box>
          <Divider my="md" />
          
          <Menu 
            shadow="md" 
            width={260} 
            position="right-end" 
            withArrow
            offset={10}
          >
            <Menu.Target>
              <UnstyledButton
                sx={(theme) => ({
                  display: 'block',
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  
                  '&:hover': {
                    backgroundColor: theme.colorScheme === 'dark' 
                      ? theme.colors.dark[6] 
                      : theme.colors.gray[0],
                  },
                })}
              >
                <Group>
                  <Avatar 
                    radius="xl" 
                    size="md"
                    color="blue"
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" weight={600}>
                      {user?.name}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {user?.email}
                    </Text>
                  </div>
                  <IconChevronDown size={16} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Hesap</Menu.Label>
              <Menu.Item 
                icon={<IconUser size={16} />} 
                component={RouterLink} 
                to="/account"
              >
                Profil Ayarları
              </Menu.Item>
              <Menu.Item 
                icon={<IconSettings size={16} />} 
                component={RouterLink} 
                to="/settings"
              >
                Entegrasyon Ayarları
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Label>Hesap Bilgileri</Menu.Label>
              <Menu.Item disabled>
                <Text size="xs" color="dimmed">
                  Rol: {user?.role === 'OWNER' ? 'Yönetici' : user?.role}
                </Text>
              </Menu.Item>
              
              <Menu.Divider />
              
              <Menu.Item 
                color="red" 
                icon={<IconLogout size={16} />} 
                onClick={handleLogout}
              >
                Çıkış Yap
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Box>
      </Stack>
    </AppShell.Navbar>
  );
}

export default AppNavbar;