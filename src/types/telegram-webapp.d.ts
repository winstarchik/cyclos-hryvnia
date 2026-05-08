export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id?: number | string;
            username?: string;
            is_premium?: boolean;
          };
          start_param?: string;
        };
        platform?: string;
      };
    };
  }
}

