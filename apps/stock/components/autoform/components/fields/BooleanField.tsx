import * as React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { AutoFormFieldProps } from '@autoform/react';
import { Controller, useFormContext } from 'react-hook-form';
import { Text } from 'react-native-paper';

export const BooleanField: React.FC<AutoFormFieldProps> = ({
  id,
  label,
  inputProps,
  field,
  error,
}) => {
  const { control, formState } = useFormContext();
  return (
    <Controller
      control={control}
      rules={{
        required: field.required,
      }}
      render={({ field: formField }) => {
        const errorMessage = formState.errors?.[formField.name];
        return (
          <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            {field.required && <Text style={styles.required}> *</Text>}
            <Switch
              value={Boolean(formField.value)}
              onValueChange={formField.onChange}
              trackColor={{ false: '#d9d9d9', true: '#1890ff' }}
              thumbColor="#ffffff"
              style={[errorMessage && styles.errorInput]}
              {...inputProps}
            />
            {/* {errorMessage && <Text style={styles.error}>{errorMessage}</Text>} */}
          </View>
        );
      }}
      name={id}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },

  label: {
    color: '#000',
    fontWeight: 'bold',
    marginRight: 5,
  },
  required: {
    color: 'red',
    marginRight: 5,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  errorInput: {
    borderColor: 'red',
  },
});
