declare global {
  interface Window {
    PayOSCheckout?: {
      usePayOS: (config: {
        RETURN_URL: string;
        ELEMENT_ID: string;
        CHECKOUT_URL: string;
        embedded?: boolean;
        onSuccess?: (event: unknown) => void;
      }) => {
        open: () => void;
        exit: () => void;
      };
    };
  }
}

export {};