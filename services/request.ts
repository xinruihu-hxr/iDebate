type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions<TData, TResponse> {
  url: string;
  method?: RequestMethod;
  data?: TData;
  fallback?: () => TResponse | Promise<TResponse>;
}

export function request<TResponse, TData = Record<string, unknown>>(
  options: RequestOptions<TData, TResponse>,
): Promise<TResponse> {
  const app = getApp<IAppOption>();

  return new Promise((resolve, reject) => {
    if (!app.globalData.apiBaseUrl) {
      reject(new Error('API 域名未配置，请设置线上后端地址'));
      return;
    }
    wx.request({
      url: `${app.globalData.apiBaseUrl}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header: {
        Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as TResponse);
          return;
        }

        const error = new Error(`Request failed with status ${response.statusCode}`);
        (error as any).fromServer = true;
        (error as any).response = response.data;
        reject(error);
      },
      fail(error) {
        reject(error);
      },
    });
  }).catch(async (error) => {
    if (options.fallback && !error.fromServer && app.globalData.enableLocalMock) {
      return options.fallback();
    }
    throw error;
  });
}
