import { z } from 'zod';
import { SIGNUP_ROLES } from '@mentora/shared';

export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name (at least 2 characters).'),
  email: z.string().trim().email('Please enter a valid email address.').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(
      PASSWORD_PATTERN,
      'Password must include uppercase, lowercase, a number, and a special character.',
    ),
  role: z.enum(SIGNUP_ROLES, { message: 'Please choose a role to continue.' }),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const studentLoginSchema = z.object({
  loginId: z.string().trim().toUpperCase().regex(/^MEN-[A-F0-9]{8}$/, 'Enter a valid Mentora Student ID.'),
  password: z.string().min(1, 'Enter your password.'),
});
