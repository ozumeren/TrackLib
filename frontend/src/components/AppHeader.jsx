import { AppShell, Burger, Title, Group } from '@mantine/core';

export function AppHeader({ opened, toggle }) {
  return (
    <AppShell.Header>
      <Group h="100%" px="md">
        <Burger
          opened={opened}
          onClick={toggle}
          hiddenFrom="sm"
          size="sm"
          aria-label="Toggle navigation"
        />
        <Title order={3}>TrackLib</Title>
      </Group>
    </AppShell.Header>
  );
}

