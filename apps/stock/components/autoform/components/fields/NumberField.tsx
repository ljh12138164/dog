import * as React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { AutoFormFieldProps } from '@autoform/react';
import { Controller, useFormContext } from 'react-hook-form';

export const NumberField: React.FC<AutoFormFieldProps> = ({ id, inputProps, field }) => {
  const { control, formState } = useFormContext();
  const fieldConfig = field.fieldConfig as any;
  return (
    <>
      <Controller
        control={control}
        rules={{
          required: field.required,
        }}
        name={id}
        render={({ field: formField }) => {
          const errorMessage = formState.errors?.[formField.name];
          return (
            <>
              <TextInput
                style={[styles.input, errorMessage && styles.errorInput]}
                value={formField.value?.toString() || ''}
                onChangeText={text => {
                  const numericValue = text.replace(/[^0-9.-]/g, '');
                  formField.onChange(numericValue === '' ? undefined : Number(numericValue));
                }}
                onBlur={formField.onBlur}
                placeholder={fieldConfig?.placeholder as string}
                editable={!fieldConfig?.readOnly}
                keyboardType="numeric"
                {...inputProps}
              />
              {/* {errorMessage && <Text style={styles.error}>{errorMessage}</Text>} */}
            </>
          );
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    width: '100%',
    minHeight: 40,
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
