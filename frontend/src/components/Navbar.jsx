import { AppShell, Group, Button, Stack, Menu, Text, Divider } from '@mantine/core';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {IconReportMoney, IconChevronRight, IconDashboard, IconChartPie, IconTargetArrow, IconSettings, IconUser, IconLogout, IconUserShield } from '@tabler/icons-react';

function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mainLinks = [
    { icon: <IconDashboard size={16} />, label: 'Dashboard', to: '/' },
    { icon: <IconChartPie size={16} />, label: 'Segmentler', to: '/segments' },
    { icon: <IconTargetArrow size={16} />, label: 'Kurallar', to: '/rules' },
    { icon: <IconReportMoney size={16} />, label: 'Terk Edilmiş Yatırımlar', to: '/abandoned-deposits' },
  ];

  const links = mainLinks.map((link) => (
    <Button
      key={link.label}
      component={RouterLink}
      to={link.to}
      variant="subtle"
      leftSection={link.icon}
      fullWidth
      styles={(theme) => ({
        root: { justifyContent: 'flex-start', paddingLeft: theme.spacing.md },
      })}
    >
      {link.label}
    </Button>
  ));

  return (
    // DEĞİŞİKLİK: 'MantineAppShell.Navbar' yerine doğru olan 'AppShell.Navbar' kullanıldı.
    <AppShell.Navbar p="md">
      {/* DEĞİŞİKLİK: Mantine'in yeni sürümlerinde kaldırılan 'Navbar.Section' yerine,
        modern bir layout tekniği olan 'Stack' bileşeni kullanıldı.
        Bu Stack, içeriği dikeyde (üst ve alt olarak) hizalamayı sağlar.
      */}
      <Stack justify="space-between" style={{ height: '100%' }}>
        {/* Üst Kısım: Navigasyon Linkleri */}
        <Stack spacing="xs">
            {links}
            {user?.role === 'ADMIN' && (
                <Button
                    component={RouterLink}
                    to="/admin/customers"
                    variant="subtle"
                    leftSection={<IconUserShield size={16} />}
                    fullWidth
                    color="yellow"
                    styles={(theme) => ({
                        root: { justifyContent: 'flex-start', paddingLeft: theme.spacing.md },
                    })}
                >
                    Yönetici Paneli
                </Button>
            )}
        </Stack>

        {/* Alt Kısım: Kullanıcı Menüsü */}
        <div>
          <Divider my="sm" />
          <Menu shadow="md" width={250} position="top-end" withArrow>
              <Menu.Target>
                  <Button variant="subtle" fullWidth>
                      <Group justify="space-between" style={{ flexWrap: 'nowrap' }}>
                        <Group spacing="xs" align="baseline">
                            <Text size="sm" fw={500}>{user?.name}</Text>
                            <Text size="xs" color="dimmed">{user?.email}</Text>
                        </Group>                         
			<IconChevronRight size={16} />
                      </Group>
                  </Button>
              </Menu.Target>
              <Menu.Dropdown>
                  <Menu.Item icon={<IconUser size={14} />} component={RouterLink} to="/account">Hesabım</Menu.Item>
                  <Menu.Item icon={<IconSettings size={14} />} component={RouterLink} to="/settings">Ayarlar</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item color="red" icon={<IconLogout size={14} />} onClick={handleLogout}>
                      Çıkış Yap
                  </Menu.Item>
              </Menu.Dropdown>
          </Menu>
        </div>
      </Stack>
    </AppShell.Navbar>
  );
}


export default AppNavbar;

