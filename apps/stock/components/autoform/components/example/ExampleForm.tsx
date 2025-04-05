import { ZodProvider } from '@autoform/zod';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { z } from 'zod';
import { AutoForm } from '../../AutoForm';
// 创建表单模式
const formSchema = z.object({
  // name: z.string().min(1, '名称最少需要1个字符').describe('名称'),
  // age: z.number({ message: '必须输入年龄' }).min(0, '年龄不能为负数'),
  // isActive: z.boolean({ message: '必须输入是否活跃' }),
  birthDate: z.array(
    z.object({
      age: z.number({ message: '必须输入年龄' }).min(0, '年龄不能为负数'),
    }),
  ),
  // gender: z.enum(['male', 'female', 'other'], { message: '必须输入性别' }),
});

// 创建Schema提供者
const schemaProvider = new ZodProvider(formSchema);

export const ExampleForm: React.FC = () => {
  const handleSubmit = async (data: any) => {
    Toast.show({
      text1: '表单提交成功',
      type: 'success',
      text2: JSON.stringify(data),
    });
  };

  return (
    <View style={styles.container}>
      <AutoForm
        schema={schemaProvider}
        onSubmit={handleSubmit}
        containerStyle={styles.form}
        withSubmit
      />
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  form: {
    width: '100%',
  },
});
