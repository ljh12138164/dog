import AutoFormBuilder from './builder/index';
import {
  FormComponents,
  DraggableComponent,
  SortableField,
  FormPreview,
  FormSettings,
} from './builder/components/index';
import { generateZodCode, generateZodSchema, createZodProvider } from './builder/utils';
import { formComponents } from './types';
import type { ComponentType, FieldType } from './types';

export {
  AutoFormBuilder,
  FormComponents,
  DraggableComponent,
  SortableField,
  FormPreview,
  FormSettings,
  generateZodCode,
  generateZodSchema,
  createZodProvider,
  formComponents,
};

export type { ComponentType, FieldType };

export default AutoFormBuilder;
