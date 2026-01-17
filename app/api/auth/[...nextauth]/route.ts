import NextAuth, { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "redis";

const getRedis = async () => {
  const client = createClient({ url: "redis://default:yGjh4ykYDlhxVv88Xd98AFIGzsSKOhRv@redis-12601.c261.us-east-1-4.ec2.cloud.redislabs.com:12601" });
  if (!client.isOpen) await client.connect();
  return client;
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "truecaller",
      name: "Truecaller",
      credentials: { requestId: { label: "Request ID", type: "text" } },
      async authorize(credentials) {
        const nonce = credentials?.requestId;
        if (!nonce) throw new Error("No RequestID");

        const client = await getRedis();
        const rawData = await client.get(nonce);
        
        if (!rawData) throw new Error("Session expired or not found");
        const data = JSON.parse(rawData);

        if (data.status !== "VERIFIED") throw new Error("Not verified yet");

        // Clean up Redis after successful login
        await client.del(nonce);

        return {
          id: data.profile.phoneNumber,
          name: `${data.profile.name.first} ${data.profile.name.last}`,
          email: data.profile.email,
          phoneNumber: data.profile.phoneNumber,
          role: "customer"
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        (token as any).phoneNumber = (user as any).phoneNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).phoneNumber = (token as any).phoneNumber;
      }
      return session;
    }
  },
  session: { strategy: "jwt" }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };