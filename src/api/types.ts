export interface ChatRequest {
  phoneNumber: string;
  message: string;
}

export interface ChatResponse {
  code: number;
  response?: string;
}

export interface ApiError {
  error: string;
}