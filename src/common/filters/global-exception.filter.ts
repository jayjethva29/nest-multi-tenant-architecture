import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ValidationError } from 'class-validator';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// Extend Request interface to include custom properties
interface CustomRequest extends Request {
  requestId?: string;
  tenantId?: string;
}

// Interface for PostgreSQL database errors
interface PostgreSQLError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  requestId?: string;
  tenantId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CustomRequest>();

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = request.requestId;
    const tenantId = request.tenantId;

    let statusCode: number;
    let message: string | string[];
    let error: string;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }

      // Handle validation errors (BadRequestException with validation details)
      if (exception instanceof BadRequestException && Array.isArray(message)) {
        error = 'Validation Failed';
        message = this.formatValidationErrors(message);
      }
    } else if (exception instanceof QueryFailedError) {
      // Handle database errors
      const dbError = this.handleDatabaseError(exception);
      statusCode = dbError.statusCode;
      message = dbError.message;
      error = dbError.error;
    } else if (exception instanceof JsonWebTokenError) {
      // Handle JWT errors
      const jwtError = this.handleJwtError(exception);
      statusCode = jwtError.statusCode;
      message = jwtError.message;
      error = jwtError.error;
    } else if (exception instanceof TokenExpiredError) {
      // Handle JWT token expired
      statusCode = HttpStatus.UNAUTHORIZED;
      message = 'Your session has expired. Please login again.';
      error = 'Token Expired';
    } else {
      // Handle unknown errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred. Please try again later.';
      error = 'Internal Server Error';
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp,
      path,
      method,
      message,
      error,
      ...(requestId && { requestId }),
      ...(tenantId && { tenantId }),
    };

    // Log the error
    this.logError(exception, errorResponse, request);

    response.status(statusCode).json(errorResponse);
  }

  private handleDatabaseError(exception: QueryFailedError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    const error = exception.driverError as PostgreSQLError;
    const errorCode = error.code;
    const errorMessage = error.detail || error.message || exception.message;

    // Handle PostgreSQL unique constraint violations
    if (errorCode === '23505') {
      // Extract constraint name and column from error message
      const constraintMatch = errorMessage.match(/Key \(([^)]+)\)=/);
      const columnName = constraintMatch ? constraintMatch[1] : 'field';

      let userFriendlyMessage: string;

      // Map common constraint violations to user-friendly messages
      if (columnName.includes('email')) {
        userFriendlyMessage = 'An account with this email address already exists.';
      } else if (columnName.includes('username')) {
        userFriendlyMessage = 'This username is already taken. Please choose a different one.';
      } else if (columnName.includes('sku')) {
        userFriendlyMessage = 'A product with this SKU already exists.';
      } else if (columnName.includes('name')) {
        userFriendlyMessage = 'An item with this name already exists.';
      } else {
        userFriendlyMessage = `A record with this ${columnName} already exists.`;
      }

      return {
        statusCode: HttpStatus.CONFLICT,
        message: userFriendlyMessage,
        error: 'Duplicate Entry',
      };
    }

    // Handle PostgreSQL foreign key constraint violations
    if (errorCode === '23503') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Cannot perform this action due to existing related records.',
        error: 'Foreign Key Constraint',
      };
    }

    // Handle PostgreSQL not null constraint violations
    if (errorCode === '23502') {
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnName = columnMatch ? columnMatch[1] : 'field';

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `The field '${columnName}' is required and cannot be empty.`,
        error: 'Required Field Missing',
      };
    }

    // Handle PostgreSQL check constraint violations
    if (errorCode === '23514') {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'The provided data violates business rules.',
        error: 'Data Validation Failed',
      };
    }

    // Handle connection errors
    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection failed. Please try again later.',
        error: 'Service Unavailable',
      };
    }

    // Default database error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'A database error occurred. Please contact support if the problem persists.',
      error: 'Database Error',
    };
  }

  private handleJwtError(exception: JsonWebTokenError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception.message.includes('malformed')) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid authentication token format. Please login again.',
        error: 'Malformed Token',
      };
    }

    if (exception.message.includes('invalid signature')) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication token signature is invalid. Please login again.',
        error: 'Invalid Token Signature',
      };
    }

    if (exception.message.includes('invalid token')) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Authentication token is invalid. Please login again.',
        error: 'Invalid Token',
      };
    }

    // Default JWT error
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Authentication failed. Please login again.',
      error: 'Authentication Error',
    };
  }

  private formatValidationErrors(errors: any[]): string[] {
    const formattedErrors: string[] = [];

    const processError = (error: any, prefix = '') => {
      if (typeof error === 'string') {
        formattedErrors.push(error);
        return;
      }

      if (error.constraints) {
        Object.values(error.constraints).forEach((constraint: any) => {
          const fieldName = prefix ? `${prefix}.${error.property}` : error.property;
          formattedErrors.push(`${fieldName}: ${constraint}`);
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child: any) => {
          const childPrefix = prefix ? `${prefix}.${error.property}` : error.property;
          processError(child, childPrefix);
        });
      }
    };

    errors.forEach((error) => processError(error));

    return formattedErrors.length > 0 ? formattedErrors : ['Validation failed'];
  }

  private logError(exception: unknown, errorResponse: ErrorResponse, request: CustomRequest): void {
    const { statusCode, message, error, requestId, tenantId } = errorResponse;
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    const logContext = {
      statusCode,
      method,
      url,
      ip,
      userAgent,
      requestId,
      tenantId,
      error: error,
      message: Array.isArray(message) ? message.join(', ') : message,
    };

    if (statusCode >= 500) {
      // Log server errors with full stack trace
      this.logger.error(`Server Error: ${method} ${url} ${statusCode} - ${error}`, {
        ...logContext,
        stack: exception instanceof Error ? exception.stack : 'No stack trace available',
        exception: exception instanceof Error ? exception.name : typeof exception,
      });
    } else if (statusCode >= 400) {
      // Log client errors without stack trace
      this.logger.warn(`Client Error:`, logContext);
    } else {
      // Log other errors as info
      this.logger.log(`Request Error:`, logContext);
    }
  }
}
