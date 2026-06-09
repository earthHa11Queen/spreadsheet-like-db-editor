export interface ConnectionSetting {
  n: number;
  dbName: string;
  dbHost: string;
  dbPort: number;
  databaseName: string;
  dbUsername: string;
  createdTimestamp: string;
  updatedTimestamp: string;
}

export interface ConnectionSettingRequest {
  dbName: string;
  dbHost: string;
  dbPort: number;
  databaseName: string;
  dbUsername: string;
  dbPassword: string;
}

export interface ConnectionTestRequest {
  connectionId?: number;
  dbName?: string;
  dbHost?: string;
  dbPort?: number;
  databaseName?: string;
  dbUsername?: string;
  dbPassword?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message: string;
}
