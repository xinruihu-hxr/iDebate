export const ENABLE_LOCAL_MOCK = true;

export function getApiBaseUrl(): string {
  const extConfig = wx.getExtConfigSync ? wx.getExtConfigSync() : {};
  const extApiBaseUrl = extConfig?.apiBaseUrl;
  const storedApiBaseUrl = wx.getStorageSync('idebate_api_base_url');
  return extApiBaseUrl || storedApiBaseUrl || '';
}
