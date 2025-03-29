import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {

  return (
    <Stack>
      <Stack.Screen name='login' />
      <Stack.Screen name='register' />
    </Stack>
  );
}
