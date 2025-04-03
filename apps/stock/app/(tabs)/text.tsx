import { FormRenderPreview } from '@/components/autoform';
import { View } from 'react-native';

export default function TextScreen() {
  return (
    <View>
      <FormRenderPreview
        fields={[{ id: 'id', type: 'text', label: 'ID', placeholder: '请输入ID', required: true }]}
      />
    </View>
  );
}
