// Kafka event types and topics

export enum KafkaTopics {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  FILE_UPLOADED = 'file.uploaded',
  URL_SHORTENED = 'url.shortened',
  STORAGE_UPDATED = 'storage.updated',
  ROLE_ASSIGNED = 'role.assigned',
  PLAN_ASSIGNED = 'plan.assigned',
}

// Event payload interfaces
export interface UserCreatedEvent {
  userId: number;
  email: string;
  roleId: number;
  planId: number;
  timestamp: string;
}

export interface UserUpdatedEvent {
  userId: number;
  updates: {
    email?: string;
    roleId?: number;
    planId?: number;
  };
  timestamp: string;
}

export interface FileUploadedEvent {
  fileId: number;
  userId: number;
  fileName: string;
  fileSize: number;
  keyId: string;
  originalViewUrl: string;
  originalDownloadUrl: string;
  shortViewUrl: string;
  shortDownloadUrl: string;
  timestamp: string;
}

export interface UrlShortenedEvent {
  shortCode: string;
  originalUrl: string;
  timestamp: string;
}

export interface StorageUpdatedEvent {
  userId: number;
  storageUsed: number;
  storageLeft: number;
  bytesAdded: number;
  timestamp: string;
}

export interface RoleAssignedEvent {
  userId: number;
  roleId: number;
  roleName: string;
  timestamp: string;
}

export interface PlanAssignedEvent {
  userId: number;
  planId: number;
  planName: string;
  storageLimit: number;
  fileLimit: number;
  timestamp: string;
}

// Generic event wrapper
export interface KafkaEvent<T> {
  topic: KafkaTopics;
  key: string;
  value: T;
  timestamp: string;
}

