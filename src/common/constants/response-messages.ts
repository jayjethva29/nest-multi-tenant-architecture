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
  TOKEN_EXPIRED: 'Token expired',
  INVALID_TOKEN: 'Invalid token',
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
  EMAIL_ALREADY_IN_USE: 'Email is already in use',
  CANNOT_ADD_SUPER_ADMIN: "Admin can't add super-admin",
  PERMISSION_NOT_GRANTED: 'Permission not granted',
  FIRST_USER_MUST_BE_SUPER_ADMIN: 'First user must be the super-admin',
  USER_ALREADY_EXISTS_LOGIN_INSTEAD:
    'At least 1 user already exists in the system. Please use those credentials to log in',
  AT_LEAST_ONE_USER_EXISTS: 'At least 1 user already exists in the system',
  CANNOT_EDIT_SUPER_ADMIN: "Admin can't edit super-admin",
  USER_CANNOT_EDIT: "User can't edit anyone",
};
