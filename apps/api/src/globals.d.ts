declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

declare module 'crypto' {
  export function randomBytes(size: number): {
    toString(encoding?: string): string;
  };
}

declare module 'node:crypto' {
  export function randomBytes(size: number): {
    toString(encoding?: string): string;
  };
}
