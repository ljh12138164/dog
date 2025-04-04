import { AutoFormFieldProps } from '@autoform/react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet, TextInput } from 'react-native';

export const StringField: React.FC<AutoFormFieldProps> = ({ id, inputProps, field, error }) => {
  const { control, formState } = useFormContext();
  console.log(field);
  return (
    <Controller
      control={control}
      rules={{
        required: field.required,
      }}
      render={({ field: formField }) => {
        const errorMessage = formState.errors?.[formField.name];
        return (
          <>
            <TextInput
              style={[styles.input, errorMessage ? styles.errorInput : null]}
              onBlur={formField.onBlur}
              onChangeText={formField.onChange}
              value={formField.value}
              {...inputProps}
            />
          </>
        );
      }}
      name={id}
    />
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
  errorInput: {
    borderColor: 'red',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
