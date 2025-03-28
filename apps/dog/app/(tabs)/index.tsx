import { Text, View } from 'react-native';
import { ShowToast } from '../_layout';
export default function HomeScreen() {
  return (
    <View>
      <View
        style={{
          width: 100,
          height: 100,
          backgroundColor: 'red',
        }}
      ></View>
      <Text
        onPress={() => {
          ShowToast('success', '首页');
        }}
      >
        首页
      </Text>
    </View>
  );
}
