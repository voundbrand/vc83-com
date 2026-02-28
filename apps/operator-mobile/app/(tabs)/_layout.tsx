import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Hide tab bar completely - navigation is via drawer menu
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
