import { useAutoFormStore } from '@/store/autoform';
import * as React from 'react';
import { useFormContext, FieldValues } from 'react-hook-form';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SubmitButtonProps {
  children: React.ReactNode;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ children }) => {
  const { onSubmit } = useAutoFormStore();
  const form = useFormContext();
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => {
        form.handleSubmit(data => {
          if (onSubmit) {
            // @ts-ignore 忽略类型检查，确保运行时正常
            onSubmit(data, form);
          }
        })();
      }}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
