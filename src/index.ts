/**
 * API Request Validator
 * 
 * Standalone library for validating and sanitizing API requests.
 */

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: Record<string, any>;
}

export class APIRequestValidator {
  private rules: ValidationRule[];

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
  }

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  validate(data: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: Record<string, any> = {};

    for (const rule of this.rules) {
      const value = data[rule.field];

      if (rule.required && (value === undefined || value === null)) {
        errors.push({ field: rule.field, message: `${rule.field} is required` });
        continue;
      }

      if (value === undefined || value === null) continue;

      if (!this.validateType(value, rule.type)) {
        errors.push({ field: rule.field, message: `${rule.field} must be of type ${rule.type}` });
        continue;
      }

      if (rule.type === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({ field: rule.field, message: `${rule.field} must be at least ${rule.minLength} characters` });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({ field: rule.field, message: `${rule.field} must be at most ${rule.maxLength} characters` });
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({ field: rule.field, message: `${rule.field} has invalid format` });
        }
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({ field: rule.field, message: `${rule.field} must be one of: ${rule.enum.join(', ')}` });
      }

      sanitized[rule.field] = this.sanitize(value, rule.type);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined
    };
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && !Array.isArray(value);
      default: return true;
    }
  }

  private sanitize(value: any, type: string): any {
    if (type === 'string') {
      return String(value).replace(/[<>]/g, '').trim();
    }
    return value;
  }

  validateSchema(data: any, schema: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = [];
    this.validateObject(data, schema, '', errors);
    return {
      valid: errors.length === 0,
      errors,
      sanitized: data
    };
  }

  private validateObject(obj: any, schema: Record<string, any>, path: string, errors: ValidationError[]): void {
    for (const key of Object.keys(schema)) {
      const rule = schema[key] as Record<string, any>;
      const value = obj[key];
      const fieldPath = path ? `${path}.${key}` : key;

      if (rule.required && value === undefined) {
        errors.push({ field: fieldPath, message: `${fieldPath} is required` });
      }

      if (value !== undefined && rule.type) {
        if (!this.validateType(value, rule.type)) {
          errors.push({ field: fieldPath, message: `${fieldPath} must be of type ${rule.type}` });
        }
      }
    }
  }
}

export default APIRequestValidator;
