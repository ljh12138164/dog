import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer>
        <Drawer.Screen
          name='index' // This is the name of the page and must match the url from root
          options={{
            drawerLabel: '主页',
            title: 'overview',
          }}
        />
        <Drawer.Screen
          name='stock' // This is the name of the page and must match the url from root
          options={{
            drawerLabel: '仓库',
            title: 'overview',
          }}
        />

        <Drawer.Screen
          name='user' // This is the name of the page and must match the url from root
          options={{
            drawerLabel: '个人',
            title: 'overview',
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
