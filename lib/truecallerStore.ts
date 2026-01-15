export type TcItem = {
  status: "pending" | "verified" | "failed";
  createdAt: number;

  // from Truecaller callback
  accessToken?: string;
  endpoint?: string;

  // fetched from Truecaller (optional)
  profile?: any;

  // your internal token / session token (demo)
  internalToken?: string;

  error?: string;
};

export const tcStore = new Map<string, TcItem>();
