import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { FieldValues, UseFormReturn } from 'react-hook-form';

interface AutoFormStore {
  form: UseFormReturn<FieldValues, any, FieldValues> | null;
  setForm: (form: UseFormReturn<FieldValues, any, FieldValues>) => void;
  onSubmit: ((values: any, form: UseFormReturn<any, any, undefined>) => void) | null;
  setOnSubmit: (
    callback: (values: any, form: UseFormReturn<any, any, undefined>) => void | Promise<void>
  ) => void;
}

const store = createStore<AutoFormStore>((set) => ({
  form: null,
  onSubmit: null,
  setForm: (form: UseFormReturn<FieldValues, any, FieldValues>) => set({ form }),
  setOnSubmit: (callback: (values: any, form: UseFormReturn<any, any, undefined>) => void | Promise<void>) => set({ onSubmit: callback }),
}));

export const useAutoFormStore = () => useStore(store);
