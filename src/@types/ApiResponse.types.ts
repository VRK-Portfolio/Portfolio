

export interface ApiGetSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface APIGetFailureResponse {
  success: false
  error: string
}

export interface APIPostSuccessProps {
  message: string
  success: true
}

export interface APIPostErrorProps {
  error: string
  errors?: {
    field: string
    message: string
  }[]
  success: false
}

export type ApiGetResponse<T> = ApiGetSuccessResponse<T> | APIGetFailureResponse;
export type ApiPostResponse = APIPostSuccessProps | APIPostErrorProps