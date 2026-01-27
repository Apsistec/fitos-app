import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Password complexity validator
 * Requires:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  const errors: ValidationErrors = {};

  if (value.length < 8) {
    errors['minLength'] = true;
  }
  if (!/[A-Z]/.test(value)) {
    errors['noUppercase'] = true;
  }
  if (!/[a-z]/.test(value)) {
    errors['noLowercase'] = true;
  }
  if (!/[0-9]/.test(value)) {
    errors['noNumber'] = true;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors['noSpecial'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Check password requirements for visual feedback
 */
export function checkPasswordRequirements(password: string): {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(value: string): string {
  if (!value) return value;
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
