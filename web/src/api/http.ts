export type HttpRequestConfig = RequestInit & {
  url: string
}

type RequestInterceptor = (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>
type ResponseInterceptor = (response: Response, config: HttpRequestConfig) => Response | Promise<Response>
type ErrorInterceptor = (error: unknown, config: HttpRequestConfig) => unknown | Promise<unknown>

class InterceptorManager<THandler> {
  private handlers: THandler[] = []

  use(handler: THandler) {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((item) => item !== handler)
    }
  }

  list() {
    return [...this.handlers]
  }
}

export class ApiError extends Error {
  status: number
  url: string
  response: Response

  constructor(config: HttpRequestConfig, response: Response) {
    super(`${config.url} 请求失败: ${response.status}`)
    this.name = 'ApiError'
    this.status = response.status
    this.url = config.url
    this.response = response
  }
}

export class HttpClient {
  interceptors = {
    request: new InterceptorManager<RequestInterceptor>(),
    response: new InterceptorManager<ResponseInterceptor>(),
    error: new InterceptorManager<ErrorInterceptor>(),
  }

  async request(config: HttpRequestConfig): Promise<Response> {
    let nextConfig = config

    try {
      for (const interceptor of this.interceptors.request.list()) {
        nextConfig = await interceptor(nextConfig)
      }

      let response = await fetch(nextConfig.url, nextConfig)

      for (const interceptor of this.interceptors.response.list()) {
        response = await interceptor(response, nextConfig)
      }

      if (!response.ok) {
        throw new ApiError(nextConfig, response)
      }

      return response
    } catch (error) {
      let nextError = error
      for (const interceptor of this.interceptors.error.list()) {
        nextError = await interceptor(nextError, nextConfig)
      }
      throw nextError
    }
  }

  async json<T>(config: HttpRequestConfig): Promise<T> {
    const response = await this.request(config)

    if (response.status === 204) {
      return null as T
    }

    return await response.json() as T
  }

  async blob(config: HttpRequestConfig): Promise<Blob> {
    const response = await this.request(config)
    return await response.blob()
  }

  get<T>(url: string, options?: RequestInit) {
    return this.json<T>({ ...options, url, method: options?.method ?? 'GET' })
  }

  post<T>(url: string, body?: unknown, options?: RequestInit) {
    return this.json<T>({ ...jsonOptions(body), ...options, url, method: 'POST' })
  }

  put<T>(url: string, body?: unknown, options?: RequestInit) {
    return this.json<T>({ ...jsonOptions(body), ...options, url, method: 'PUT' })
  }

  patch<T>(url: string, body?: unknown, options?: RequestInit) {
    return this.json<T>({ ...jsonOptions(body), ...options, url, method: 'PATCH' })
  }

  delete<T>(url: string, options?: RequestInit) {
    return this.json<T>({ ...options, url, method: 'DELETE' })
  }
}

const jsonOptions = (body?: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const apiClient = new HttpClient()
