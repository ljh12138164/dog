import { AutoFormFieldProps } from '@autoform/react';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const SelectField: React.FC<AutoFormFieldProps> = ({ id, inputProps, field }) => {
  const { control, formState } = useFormContext();
  const options: [string, string][] | undefined = field?.options;
  const [modalVisible, setModalVisible] = React.useState(false);

  return (
    <Controller
      control={control}
      rules={{
        required: field.required,
      }}
      render={({ field: formField }) => {
        const handleSelect = (option: [string, string]) => {
          formField.onChange(option[0]);
          setModalVisible(false);
        };
        const errorMessage = formState.errors?.[formField.name];

        return (
          <View>
            <TouchableOpacity style={styles.selectButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.selectText}>{formField.value}</Text>
            </TouchableOpacity>

            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>请选择</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Text style={styles.closeButton}>关闭</Text>
                    </TouchableOpacity>
                  </View>

                  {options && (
                    <FlatList
                      data={options}
                      keyExtractor={item => item[0]}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.optionItem,
                            item[0] === formField.value && styles.selectedOption,
                            errorMessage && styles.errorInput,
                          ]}
                          onPress={() => handleSelect(item)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              item[0] === formField.value && styles.selectedOptionText,
                            ]}
                          >
                            {item[1]}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </View>
            </Modal>
            {/* {errorMessage && <Text style={styles.error}>{errorMessage}</Text>} */}
          </View>
        );
      }}
      name={id}
    />
  );
};

const styles = StyleSheet.create({
  selectButton: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    padding: 10,
    backgroundColor: 'white',
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 16,
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
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#1890ff',
    fontSize: 16,
  },
  optionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#e6f7ff',
  },
  optionText: {
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#1890ff',
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
