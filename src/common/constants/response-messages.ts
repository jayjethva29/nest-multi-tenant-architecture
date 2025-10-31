export const AuthResponseMessages = {
  LOGIN_SUCCESS: 'User logged in successfully',
  LOGOUT_SUCCESS: 'Logout successfully',
  TOKEN_REFRESH_SUCCESS: 'New access token retrieved successfully',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully',
  EXPIRED_TOKENS_REMOVED: 'Expired tokens removed successfully',
  RESET_PASSWORD_REQUEST_SUCCESS: 'Reset password request created successfully',
  RESET_PASSWORD_SUCCESS: 'Password reset successfully',
  VALIDATE_TOKEN_SUCCESS: 'Token validated successfully',

  // Exception Responses
  USER_NOT_FOUND: 'User not found',
  INVALID_TOKEN_KEY: 'Invalid token key',
  LOGOUT_ERROR: 'Error while logout',
  TOKEN_EXPIRED: 'Your session has expired. Please login again.',
  INVALID_TOKEN: 'Authentication token is invalid. Please login again.',
  MALFORMED_TOKEN: 'Invalid authentication token format. Please login again.',
  TOKEN_SIGNATURE_INVALID: 'Authentication token signature is invalid. Please login again.',
  EMAIL_NOT_REGISTERED: 'This email is not registered',
  INVALID_UPDATES: 'Invalid updates',
  PASSWORD_RESET_TOKEN_EXPIRED: 'Password reset token is invalid or has expired',
  ERROR_UPDATING_PASSWORD: 'Error updating password',
};

export const UserResponseMessages = {
  USER_CREATED: 'User created successfully',
  ADMIN_CREATED: 'Admin user created successfully',
  USERS_FETCHED: 'Users fetched successfully',
  USER_FETCHED: 'User fetched successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',

  // Exception Responses
  EMAIL_ALREADY_IN_USE: 'An account with this email address already exists.',
  USERNAME_ALREADY_EXISTS: 'This username is already taken. Please choose a different one.',
  CANNOT_ADD_SUPER_ADMIN: "Admin can't add super-admin",
  PERMISSION_NOT_GRANTED: 'Permission not granted',
  FIRST_USER_MUST_BE_SUPER_ADMIN: 'First user must be the super-admin',
  USER_ALREADY_EXISTS_LOGIN_INSTEAD:
    'At least 1 user already exists in the system. Please use those credentials to log in',
  AT_LEAST_ONE_USER_EXISTS: 'At least 1 user already exists in the system',
  CANNOT_EDIT_SUPER_ADMIN: "Admin can't edit super-admin",
  USER_CANNOT_EDIT: "User can't edit anyone",
};

export const ValidationResponseMessages = {
  VALIDATION_FAILED: 'The provided data contains validation errors.',
  REQUIRED_FIELD_MISSING: 'One or more required fields are missing.',
  INVALID_FORMAT: 'The data format is invalid.',
  INVALID_EMAIL_FORMAT: 'Please provide a valid email address.',
  PASSWORD_TOO_WEAK: 'Password does not meet security requirements.',
  INVALID_DATE_FORMAT: 'Please provide a valid date format.',
  INVALID_PHONE_NUMBER: 'Please provide a valid phone number.',
  VALUE_TOO_LONG: 'The provided value is too long.',
  VALUE_TOO_SHORT: 'The provided value is too short.',
  INVALID_ENUM_VALUE: 'The provided value is not allowed.',
};

export const DatabaseResponseMessages = {
  DUPLICATE_ENTRY: 'A record with this information already exists.',
  FOREIGN_KEY_CONSTRAINT: 'Cannot perform this action due to existing related records.',
  REQUIRED_FIELD_MISSING: 'A required field is missing.',
  DATA_VALIDATION_FAILED: 'The provided data violates business rules.',
  CONNECTION_FAILED: 'Database connection failed. Please try again later.',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  QUERY_TIMEOUT: 'The operation took too long to complete. Please try again.',
  INSUFFICIENT_PERMISSIONS: 'Insufficient database permissions to perform this operation.',
};

export const SystemResponseMessages = {
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
  REQUEST_TIMEOUT: 'The request timed out. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  MAINTENANCE_MODE: 'System is under maintenance. Please try again later.',
  FEATURE_DISABLED: 'This feature is currently disabled.',
};
