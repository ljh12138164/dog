import * as React from 'react';
import { View, TouchableOpacity, Text, Platform, StyleSheet } from 'react-native';
import { AutoFormFieldProps } from '@autoform/react';
import { Controller, useFormContext } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';

export const DateField: React.FC<AutoFormFieldProps> = ({ id, inputProps, field }) => {
  const { control, formState } = useFormContext();
  const [show, setShow] = React.useState(false);

  return (
    <Controller
      control={control}
      rules={{
        required: field.required,
      }}
      render={({ field: formField }) => {
        const date = formField.value ? new Date(formField.value) : new Date();
        const formattedDate = date.toLocaleDateString();
        const errorMessage = formState.errors?.[formField.name];
        const onChange = (_: any, selectedDate?: Date) => {
          const currentDate = selectedDate || date;
          setShow(Platform.OS === 'ios');
          formField.onChange(currentDate.toISOString());
        };

        const showDatepicker = () => {
          setShow(true);
        };

        return (
          <View>
            <TouchableOpacity
              style={[styles.input, errorMessage && styles.errorInput]}
              onPress={showDatepicker}
            >
              <Text style={styles.dateText}>{formField.value ? formattedDate : '选择日期'}</Text>
            </TouchableOpacity>
            {show && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode="date"
                display="default"
                onChange={onChange}
                {...inputProps}
              />
            )}
            {/* {errorMessage && <Text style={styles.error}>{errorMessage}</Text>} */}
          </View>
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
    backgroundColor: 'white',
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
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
