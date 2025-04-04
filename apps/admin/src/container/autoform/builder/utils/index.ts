import { FieldType } from '../../types';
import { ZodProvider } from '@autoform/zod';
import { z } from 'zod';

/**
 * 根据字段类型获取对应的 zod 验证规则
 */
export const getZodTypeByFieldType = (field: FieldType): string => {
  switch (field.type) {
    case 'input':
      return 'string';
    case 'select':
    case 'radio':
      if (field.options && field.options.length > 0) {
        return `enum([${field.options.map(opt => `'${opt.value}'`).join(', ')}])`;
      }
      return 'string';
    case 'checkbox':
      return 'boolean';
    case 'file':
      return 'any';
    case 'daterange':
      return 'date';
    default:
      return 'string';
  }
};

/**
 * 生成 Zod Schema 代码
 */
export const generateZodCode = (fields: FieldType[]): string => {
  let code = 'const zodFormSchema = z.object({\n';
  
  fields.forEach(field => {
    const fieldName = field.label.toLowerCase().replace(/\s+/g, '_');
    let fieldCode = `  ${fieldName}: z.${getZodTypeByFieldType(field)}()`;
    
    if (field.required) {
      fieldCode += '.superRefine(fieldConfig({\n';
      fieldCode += `    description: '${field.placeholder || ''}',\n`;
      
      if (field.type === 'input') {
        fieldCode += `    inputProps: {\n`;
        fieldCode += `      placeholder: '${field.placeholder || ''}',\n`;
        fieldCode += `    },\n`;
      }
      
      fieldCode += '  }))';
    } else {
      fieldCode += '.optional()';
    }
    
    code += `${fieldCode},\n`;
  });
  
  code += '});\n\n';
  code += 'export const zodSchemaProvider = new ZodProvider(zodFormSchema);';
  
  return code;
};

/**
 * 生成 Zod Schema 对象
 */
export const generateZodSchema = (fields: FieldType[]): z.ZodObject<any> => {
  const schemaObj: Record<string, any> = {};
  
  fields.forEach(field => {
    const fieldName = field.label.toLowerCase().replace(/\s+/g, '_');
    let zodType;
    
    switch (field.type) {
      case 'input':
        zodType = z.string();
        break;
      case 'select':
      case 'radio':
        console.log(field);
        if (field.options && field.options.length > 0) {
          const enumValues = field.options.map(opt => opt.value);
          zodType = z.enum(enumValues as [string, ...string[]]);
        } else {
          zodType = z.string();
        }
        break;
      case 'checkbox':
        zodType = z.boolean();
        break;
      case 'file':
        zodType = z.any();
        break;
      case 'daterange':
        zodType = z.date();
        break;
      default:
        zodType = z.string();
    }
    
    if (!field.required) {
      zodType = zodType.optional();
    }
    
    schemaObj[fieldName] = zodType;
  });
  
  return z.object(schemaObj);
};

/**
 * 创建 Zod Provider
 */
export const createZodProvider = (fields: FieldType[]): ZodProvider<z.ZodObject<any>> => {
  const schema = generateZodSchema(fields);
  return new ZodProvider(schema);
}; 