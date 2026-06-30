interface IAppOption {
  globalData: {
    apiBaseUrl: string;
    enableLocalMock: boolean;
    token?: string;
    currentUser?: {
      id: number;
      nickname: string;
      avatarUrl?: string;
      school?: string;
      major?: string;
      grade?: string;
      bio?: string;
    };
  };
}
