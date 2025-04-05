import { AutoFormFieldProps } from '@autoform/react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button, Platform, StyleSheet, View } from 'react-native';
import DateTimePickerModal, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export const DateField: React.FC<AutoFormFieldProps> = ({ id, inputProps, field }) => {
  const { control, formState } = useFormContext();
  return (
    <Controller
      control={control}
      rules={{
        required: field.required,
      }}
      render={({ field: formField }) => {
        const [isDatePickerVisible, setDatePickerVisibility] = React.useState(false);
        // const errorMessage = formState.errors?.[formField.name];

        const showDatePicker = () => {
          setDatePickerVisibility(true);
        };

        const hideDatePicker = () => {
          setDatePickerVisibility(false);
        };

        const handleConfirm = (event: DateTimePickerEvent, date?: Date) => {
          console.warn('A date has been picked: ', date);
          hideDatePicker();
          formField.onChange(date?.toISOString() ?? '');
        };

        // 渲染不同平台的日期选择器
        return (
          <View>
            <Button
              title={formField.value ? formField.value : '选择日期'}
              onPress={showDatePicker}
            />
            {isDatePickerVisible && (
              <DateTimePickerModal
                // isVisible={isDatePickerVisible}
                mode="date"
                value={formField.value ? new Date(formField.value) : new Date()}
                onChange={handleConfirm}
              />
            )}
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  buttonText: {
    fontSize: 16,
  },
});
